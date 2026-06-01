package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/require"
)

func TestPricingIncludesOwnerAliases(t *testing.T) {
	payload, err := common.Marshal(Pricing{
		ModelName: "gpt-test",
		OwnerBy:   "OpenAI",
		OwnedBy:   "OpenAI",
	})
	require.NoError(t, err)
	require.JSONEq(t, `{
		"model_name": "gpt-test",
		"owner_by": "OpenAI",
		"owned_by": "OpenAI",
		"quota_type": 0,
		"model_ratio": 0,
		"model_price": 0,
		"completion_ratio": 0,
		"enable_groups": null,
		"supported_endpoint_types": null
	}`, string(payload))
}

func TestBuildPricingModelOwnerMapUsesEnabledChannelType(t *testing.T) {
	lowPriority := int64(1)
	highPriority := int64(10)
	owners := buildPricingModelOwnerMap([]AbilityWithChannel{
		{Ability: Ability{Model: "gpt-test"}, ChannelType: constant.ChannelTypeOpenAI},
		{Ability: Ability{Model: "claude-test"}, ChannelType: constant.ChannelTypeAnthropic},
		{Ability: Ability{Model: "multi-provider-test", Priority: &lowPriority}, ChannelType: constant.ChannelTypeOpenAI},
		{Ability: Ability{Model: "multi-provider-test", Priority: &highPriority}, ChannelType: constant.ChannelTypeGemini},
		{Ability: Ability{Model: ""}, ChannelType: constant.ChannelTypeGemini},
		{Ability: Ability{Model: "unknown-test"}, ChannelType: constant.ChannelTypeUnknown},
	})

	require.Equal(t, "OpenAI", owners["gpt-test"])
	require.Equal(t, "Anthropic", owners["claude-test"])
	require.Equal(t, "Gemini", owners["multi-provider-test"])
	require.NotContains(t, owners, "")
	require.NotContains(t, owners, "unknown-test")
}
