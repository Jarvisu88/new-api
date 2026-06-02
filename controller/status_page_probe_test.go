package controller

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

func TestProbeStatusPageComponentsOnceStopsStartingRequestsAtRoundBudget(t *testing.T) {
	originalDeps := statusPageProbeDeps
	originalRequestInterval := common.RequestInterval
	t.Cleanup(func() {
		statusPageProbeDeps = originalDeps
		common.RequestInterval = originalRequestInterval
	})
	common.RequestInterval = 0

	groups := make([]string, 0, 34)
	for i := 1; i <= 34; i++ {
		groups = append(groups, fmt.Sprintf("group-%02d", i))
	}
	bindings, err := model.EncodeStatusPageBindings(model.StatusPageComponentBindings{
		Groups: groups,
		Probe: model.StatusPageComponentProbe{
			Enabled: true,
			Models:  []string{"model-a"},
		},
	})
	if err != nil {
		t.Fatalf("encode bindings: %v", err)
	}

	testRequests := 0
	sleepCalls := 0
	logs := make([]string, 0)
	statusPageProbeDeps = statusPageProbeDependencies{
		getEnabledComponents: func() ([]model.StatusPageComponent, error) {
			return []model.StatusPageComponent{
				{
					Id:       42,
					Enabled:  true,
					Bindings: bindings,
				},
			}, nil
		},
		hasRecentSuccess: func(group string, modelName string, since int64) (bool, error) {
			return false, nil
		},
		getProbeChannels: func(group string, modelName string, limit int) ([]*model.Channel, error) {
			if limit != statusPageProbeMaxChannelsEach {
				t.Fatalf("expected channel limit %d, got %d", statusPageProbeMaxChannelsEach, limit)
			}
			return []*model.Channel{
				{Id: 1},
				{Id: 2},
				{Id: 3},
			}, nil
		},
		testChannel: func(channel *model.Channel, testModel string, endpointType string, isStream bool) testResult {
			testRequests++
			return testResult{}
		},
		shouldUseStream: func(channel *model.Channel) bool {
			return false
		},
		upsertProbeResult: func(result *model.StatusPageProbeResult) error {
			return nil
		},
		updateResponseTime: func(channel *model.Channel, milliseconds int64) {},
		sleep: func(duration time.Duration) {
			sleepCalls++
		},
		log: func(message string) {
			logs = append(logs, message)
		},
	}

	probeStatusPageComponentsOnce()

	if testRequests != statusPageProbeMaxRequestsEachRound {
		t.Fatalf("expected %d test requests, got %d", statusPageProbeMaxRequestsEachRound, testRequests)
	}
	if sleepCalls != statusPageProbeMaxRequestsEachRound {
		t.Fatalf("expected %d sleep calls, got %d", statusPageProbeMaxRequestsEachRound, sleepCalls)
	}
	joinedLogs := strings.Join(logs, "\n")
	if !strings.Contains(joinedLogs, "component=42") ||
		!strings.Contains(joinedLogs, "group=group-34") ||
		!strings.Contains(joinedLogs, "model=model-a") ||
		!strings.Contains(joinedLogs, "budget") {
		t.Fatalf("expected budget skip log with component/group/model context, got logs: %q", joinedLogs)
	}
}
