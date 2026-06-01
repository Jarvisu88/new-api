package service

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/require"
)

func TestRankingConfigRejectsUnknownPeriod(t *testing.T) {
	_, err := rankingConfig("quarter")
	require.Error(t, err)
	require.Contains(t, err.Error(), "invalid ranking period")
}

func TestRankingTimeRangeForAllStartsAtZero(t *testing.T) {
	config, err := rankingConfig("all")
	require.NoError(t, err)

	now := time.Unix(1_700_000_000, 0)
	start, end := rankingTimeRange(config, now)

	require.EqualValues(t, 0, start)
	require.EqualValues(t, now.Unix(), end)
}

func TestRankingShareAndGrowthAreRounded(t *testing.T) {
	require.Equal(t, 0.3333, rankingShare(1, 3))
	require.Equal(t, 0.0, rankingShare(1, 0))
	require.Equal(t, 50.0, rankingGrowthPct(150, 100))
	require.Equal(t, 100.0, rankingGrowthPct(5, 0))
	require.Equal(t, 0.0, rankingGrowthPct(0, 0))
}

func TestBuildRankedVendorsAggregatesByModelMetadata(t *testing.T) {
	meta := map[string]rankingModelMeta{
		"gpt-alpha": {vendor: "OpenAI", vendorIcon: "openai"},
		"gpt-beta":  {vendor: "OpenAI", vendorIcon: "openai"},
		"claude":    {vendor: "Anthropic", vendorIcon: "anthropic"},
	}
	current := []model.RankingQuotaTotal{
		{ModelName: "gpt-alpha", TotalTokens: 120},
		{ModelName: "gpt-beta", TotalTokens: 80},
		{ModelName: "claude", TotalTokens: 50},
	}
	previous := []model.RankingQuotaTotal{
		{ModelName: "gpt-alpha", TotalTokens: 70},
		{ModelName: "gpt-beta", TotalTokens: 30},
		{ModelName: "claude", TotalTokens: 50},
	}

	vendors := buildRankedVendors(current, previous, 250, meta, true)

	require.Len(t, vendors, 2)
	require.Equal(t, "OpenAI", vendors[0].Vendor)
	require.Equal(t, "openai", vendors[0].VendorIcon)
	require.EqualValues(t, 200, vendors[0].TotalTokens)
	require.EqualValues(t, 2, vendors[0].ModelsCount)
	require.Equal(t, "gpt-alpha", vendors[0].TopModel)
	require.Equal(t, 0.8, vendors[0].Share)
	require.Equal(t, 100.0, vendors[0].GrowthPct)

	require.Equal(t, "Anthropic", vendors[1].Vendor)
	require.EqualValues(t, 50, vendors[1].TotalTokens)
	require.Equal(t, 0.2, vendors[1].Share)
	require.Equal(t, 0.0, vendors[1].GrowthPct)
}

func TestBuildRankingMoversSortsRisersAndDroppers(t *testing.T) {
	previousRankOne := 1
	previousRankTwo := 2
	previousRankFive := 5

	models := []RankedModel{
		{ModelName: "riser", Vendor: "A", Rank: 1, PreviousRank: &previousRankFive, GrowthPct: 20},
		{ModelName: "dropper", Vendor: "B", Rank: 4, PreviousRank: &previousRankOne, GrowthPct: -30},
		{ModelName: "flat", Vendor: "C", Rank: 2, PreviousRank: &previousRankTwo, GrowthPct: 0},
		{ModelName: "new", Vendor: "D", Rank: 3, GrowthPct: 100},
	}

	movers, droppers := buildRankingMovers(models)

	require.Len(t, movers, 1)
	require.Equal(t, "riser", movers[0].ModelName)
	require.Equal(t, 4, movers[0].RankDelta)

	require.Len(t, droppers, 1)
	require.Equal(t, "dropper", droppers[0].ModelName)
	require.Equal(t, -3, droppers[0].RankDelta)
}
