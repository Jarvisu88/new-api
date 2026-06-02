package controller

import (
	"fmt"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
)

const (
	statusPageProbeInterval             = 10 * time.Minute
	statusPageProbeRealLogWindow        = 24 * time.Hour
	statusPageProbeMaxChannelsEach      = 3
	statusPageProbeMaxRequestsEachRound = 100
)

var (
	statusPageProbeOnce sync.Once
	statusPageProbeLock sync.Mutex
)

type statusPageProbeDependencies struct {
	getEnabledComponents func() ([]model.StatusPageComponent, error)
	hasRecentSuccess     func(group string, modelName string, since int64) (bool, error)
	getProbeChannels     func(group string, modelName string, limit int) ([]*model.Channel, error)
	testChannel          func(channel *model.Channel, testModel string, endpointType string, isStream bool) testResult
	shouldUseStream      func(channel *model.Channel) bool
	upsertProbeResult    func(result *model.StatusPageProbeResult) error
	updateResponseTime   func(channel *model.Channel, milliseconds int64)
	sleep                func(duration time.Duration)
	log                  func(message string)
}

var statusPageProbeDeps = statusPageProbeDependencies{
	getEnabledComponents: model.GetEnabledStatusPageComponents,
	hasRecentSuccess:     service.HasRecentStatusPageSuccessfulLog,
	getProbeChannels:     model.GetStatusPageProbeChannels,
	testChannel:          testChannel,
	shouldUseStream:      shouldUseStreamForAutomaticChannelTest,
	upsertProbeResult:    model.UpsertStatusPageProbeResult,
	updateResponseTime: func(channel *model.Channel, milliseconds int64) {
		channel.UpdateResponseTime(milliseconds)
	},
	sleep: time.Sleep,
	log:   common.SysLog,
}

func AutomaticallyProbeStatusPageComponents() {
	if !common.IsMasterNode {
		return
	}
	statusPageProbeOnce.Do(func() {
		for {
			probeStatusPageComponentsOnce()
			time.Sleep(statusPageProbeInterval)
		}
	})
}

func probeStatusPageComponentsOnce() {
	if !statusPageProbeLock.TryLock() {
		statusPageProbeDeps.log("status page probe skipped because previous round is still running")
		return
	}
	defer statusPageProbeLock.Unlock()

	components, err := statusPageProbeDeps.getEnabledComponents()
	if err != nil {
		statusPageProbeDeps.log("status page probe failed to load components: " + err.Error())
		return
	}
	requestsStarted := 0
	for _, component := range components {
		bindings, err := model.ParseStatusPageBindings(component.Bindings)
		if err != nil {
			statusPageProbeDeps.log(fmt.Sprintf("status page probe skipped component %d: %v", component.Id, err))
			continue
		}
		if !bindings.Probe.Enabled || len(bindings.Groups) == 0 || len(bindings.Probe.Models) == 0 {
			continue
		}
		for _, group := range bindings.Groups {
			for _, modelName := range bindings.Probe.Models {
				if requestsStarted >= statusPageProbeMaxRequestsEachRound {
					logStatusPageProbeBudgetSkip(component, group, modelName)
					continue
				}
				requestsStarted += probeStatusPageComponentModel(
					component,
					group,
					modelName,
					statusPageProbeMaxRequestsEachRound-requestsStarted,
				)
			}
		}
	}
}

func probeStatusPageComponentModel(component model.StatusPageComponent, group string, modelName string, remainingBudget int) int {
	if remainingBudget <= 0 {
		logStatusPageProbeBudgetSkip(component, group, modelName)
		return 0
	}

	hasRecentSuccess, err := statusPageProbeDeps.hasRecentSuccess(
		group,
		modelName,
		time.Now().Add(-statusPageProbeRealLogWindow).Unix(),
	)
	if err != nil {
		statusPageProbeDeps.log(fmt.Sprintf("status page probe failed checking logs for component=%d group=%s model=%s: %v", component.Id, group, modelName, err))
		return 0
	}
	if hasRecentSuccess {
		return 0
	}

	channels, err := statusPageProbeDeps.getProbeChannels(group, modelName, statusPageProbeMaxChannelsEach)
	if err != nil {
		statusPageProbeDeps.log(fmt.Sprintf("status page probe failed loading channels for component=%d group=%s model=%s: %v", component.Id, group, modelName, err))
		return 0
	}
	requestsStarted := 0
	for _, channel := range channels {
		if requestsStarted >= remainingBudget {
			statusPageProbeDeps.log(fmt.Sprintf(
				"status page probe skipped remaining channels after round request budget reached component=%d group=%s model=%s budget=%d",
				component.Id,
				group,
				modelName,
				statusPageProbeMaxRequestsEachRound,
			))
			break
		}
		tik := time.Now()
		result := statusPageProbeDeps.testChannel(channel, modelName, "", statusPageProbeDeps.shouldUseStream(channel))
		requestsStarted++
		milliseconds := int(time.Since(tik).Milliseconds())

		success := result.localErr == nil && result.newAPIError == nil
		message := ""
		if result.localErr != nil {
			message = result.localErr.Error()
		} else if result.newAPIError != nil {
			message = result.newAPIError.Error()
		}
		if result.newAPIError != nil {
			errorCode := string(result.newAPIError.GetErrorCode())
			if errorCode != "" {
				if message == "" {
					message = errorCode
				} else {
					message = message + " (" + errorCode + ")"
				}
			}
		}

		if err := statusPageProbeDeps.upsertProbeResult(&model.StatusPageProbeResult{
			ComponentId:  component.Id,
			Group:        group,
			ModelName:    modelName,
			ChannelId:    channel.Id,
			Success:      success,
			Message:      message,
			ResponseTime: milliseconds,
			TestedAt:     time.Now().Unix(),
		}); err != nil {
			statusPageProbeDeps.log(fmt.Sprintf("status page probe failed saving result component=%d channel=%d model=%s: %v", component.Id, channel.Id, modelName, err))
		}

		statusPageProbeDeps.updateResponseTime(channel, int64(milliseconds))
		statusPageProbeDeps.sleep(common.RequestInterval)
	}
	return requestsStarted
}

func logStatusPageProbeBudgetSkip(component model.StatusPageComponent, group string, modelName string) {
	statusPageProbeDeps.log(fmt.Sprintf(
		"status page probe skipped because round request budget reached component=%d group=%s model=%s budget=%d",
		component.Id,
		group,
		modelName,
		statusPageProbeMaxRequestsEachRound,
	))
}
