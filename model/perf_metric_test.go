package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpsertPerfMetricAccumulatesAndQueriesGroup(t *testing.T) {
	truncateTables(t)

	first := &PerfMetric{
		ModelName:      "gpt-perf",
		Group:          "default",
		BucketTs:       1000,
		RequestCount:   2,
		SuccessCount:   1,
		TotalLatencyMs: 300,
		TtftSumMs:      80,
		TtftCount:      2,
		OutputTokens:   40,
		GenerationMs:   1000,
	}
	second := &PerfMetric{
		ModelName:      "gpt-perf",
		Group:          "default",
		BucketTs:       1000,
		RequestCount:   3,
		SuccessCount:   3,
		TotalLatencyMs: 600,
		TtftSumMs:      120,
		TtftCount:      3,
		OutputTokens:   90,
		GenerationMs:   2000,
	}

	require.NoError(t, UpsertPerfMetric(first))
	require.NoError(t, UpsertPerfMetric(second))

	rows, err := GetPerfMetrics("gpt-perf", "default", 900, 1100)
	require.NoError(t, err)
	require.Len(t, rows, 1)

	assert.EqualValues(t, 5, rows[0].RequestCount)
	assert.EqualValues(t, 4, rows[0].SuccessCount)
	assert.EqualValues(t, 900, rows[0].TotalLatencyMs)
	assert.EqualValues(t, 200, rows[0].TtftSumMs)
	assert.EqualValues(t, 5, rows[0].TtftCount)
	assert.EqualValues(t, 130, rows[0].OutputTokens)
	assert.EqualValues(t, 3000, rows[0].GenerationMs)
}
