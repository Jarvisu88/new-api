package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type statusPageComponentRequest struct {
	Id          int                               `json:"id"`
	Name        string                            `json:"name"`
	Description string                            `json:"description"`
	Status      string                            `json:"status"`
	Enabled     bool                              `json:"enabled"`
	SortOrder   int                               `json:"sort_order"`
	Bindings    model.StatusPageComponentBindings `json:"bindings"`
}

type statusPageIncidentRequest struct {
	Id           int    `json:"id"`
	Title        string `json:"title"`
	Impact       string `json:"impact"`
	Status       string `json:"status"`
	ComponentIds []int  `json:"component_ids"`
	StartedAt    int64  `json:"started_at"`
	ResolvedAt   int64  `json:"resolved_at"`
}

type statusPageIncidentUpdateRequest struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

type statusPageReorderRequest struct {
	Ids []int `json:"ids"`
}

func GetPublicStatusPageSummary(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "90"))
	summary, err := service.BuildStatusPageSummary(days)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, summary)
}

func GetPublicStatusPageIncidents(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	status := c.DefaultQuery("status", "active")
	if status != "active" && status != "resolved" && status != "all" {
		status = "active"
	}
	incidents, total, err := model.GetStatusPageIncidents(status, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	views, err := service.BuildStatusPageIncidentViews(incidents)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(views)
	common.ApiSuccess(c, pageInfo)
}

func GetPublicStatusPageIncident(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	incident, err := model.GetStatusPageIncidentById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	views, err := service.BuildStatusPageIncidentViews([]model.StatusPageIncident{*incident})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if len(views) == 0 {
		common.ApiErrorMsg(c, "事件不存在")
		return
	}
	common.ApiSuccess(c, views[0])
}

func AdminListStatusPageComponents(c *gin.Context) {
	components, err := model.GetAllStatusPageComponents()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	for idx := range components {
		status, err := service.GetComponentCurrentUptimeStatus(components[idx])
		if err != nil {
			common.ApiError(c, err)
			return
		}
		components[idx].Status = status
	}
	common.ApiSuccess(c, components)
}

func AdminCreateStatusPageComponent(c *gin.Context) {
	component, err := bindStatusPageComponent(c)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.CreateStatusPageComponent(component); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, component)
}

func AdminUpdateStatusPageComponent(c *gin.Context) {
	component, err := bindStatusPageComponent(c)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	component.Id = id
	if err := model.UpdateStatusPageComponent(component); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, component)
}

func AdminDeleteStatusPageComponent(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DeleteStatusPageComponent(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminReorderStatusPageComponents(c *gin.Context) {
	var req statusPageReorderRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.ReorderStatusPageComponents(req.Ids); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminGetStatusPageModelOptions(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "90"))
	options, err := service.BuildStatusPageModelOptions(c.Query("group"), days)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, options)
}

func AdminListStatusPageIncidents(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	status := c.DefaultQuery("status", "all")
	incidents, total, err := model.GetStatusPageIncidents(status, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	views, err := service.BuildStatusPageIncidentViews(incidents)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(views)
	common.ApiSuccess(c, pageInfo)
}

func AdminCreateStatusPageIncident(c *gin.Context) {
	incident, err := bindStatusPageIncident(c)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.CreateStatusPageIncident(incident); err != nil {
		common.ApiError(c, err)
		return
	}
	respondStatusPageIncident(c, incident)
}

func AdminUpdateStatusPageIncident(c *gin.Context) {
	incident, err := bindStatusPageIncident(c)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	incident.Id = id
	if err := model.UpdateStatusPageIncident(incident); err != nil {
		common.ApiError(c, err)
		return
	}
	respondStatusPageIncident(c, incident)
}

func AdminDeleteStatusPageIncident(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DeleteStatusPageIncident(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminCreateStatusPageIncidentUpdate(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	var req statusPageIncidentUpdateRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiError(c, err)
		return
	}
	update := &model.StatusPageIncidentUpdate{
		IncidentId: id,
		Status:     req.Status,
		Message:    req.Message,
	}
	if err := model.CreateStatusPageIncidentUpdate(update); err != nil {
		common.ApiError(c, err)
		return
	}
	respondStatusPageIncidentById(c, id)
}

func AdminResolveStatusPageIncident(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.ResolveStatusPageIncident(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func bindStatusPageComponent(c *gin.Context) (*model.StatusPageComponent, error) {
	var req statusPageComponentRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		return nil, err
	}
	bindings, err := model.EncodeStatusPageBindings(req.Bindings)
	if err != nil {
		return nil, err
	}
	return &model.StatusPageComponent{
		Id:          req.Id,
		Name:        req.Name,
		Description: req.Description,
		Status:      req.Status,
		Enabled:     req.Enabled,
		SortOrder:   req.SortOrder,
		Bindings:    bindings,
	}, nil
}

func bindStatusPageIncident(c *gin.Context) (*model.StatusPageIncident, error) {
	var req statusPageIncidentRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		return nil, err
	}
	componentIds, err := model.EncodeStatusPageComponentIds(req.ComponentIds)
	if err != nil {
		return nil, err
	}
	return &model.StatusPageIncident{
		Id:           req.Id,
		Title:        req.Title,
		Impact:       req.Impact,
		Status:       req.Status,
		ComponentIds: componentIds,
		StartedAt:    req.StartedAt,
		ResolvedAt:   req.ResolvedAt,
	}, nil
}

func respondStatusPageIncident(c *gin.Context, incident *model.StatusPageIncident) {
	views, err := service.BuildStatusPageIncidentViews([]model.StatusPageIncident{*incident})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if len(views) == 0 {
		common.ApiErrorMsg(c, "事件不存在")
		return
	}
	common.ApiSuccess(c, views[0])
}

func respondStatusPageIncidentById(c *gin.Context, id int) {
	incident, err := model.GetStatusPageIncidentById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	respondStatusPageIncident(c, incident)
}
