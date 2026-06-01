package perfmetrics

import "testing"

func TestBuildQueryResultAggregatesGroups(t *testing.T) {
	result := buildQueryResult("gpt-test", map[bucketKey]counters{
		{model: "gpt-test", group: "default", bucketTs: 100}: {
			requestCount:   2,
			successCount:   1,
			totalLatencyMs: 300,
			ttftSumMs:      120,
			ttftCount:      2,
			outputTokens:   50,
			generationMs:   1000,
		},
		{model: "gpt-test", group: "vip", bucketTs: 100}: {
			requestCount:   1,
			successCount:   1,
			totalLatencyMs: 90,
			outputTokens:   30,
			generationMs:   1500,
		},
		{model: "gpt-test", group: "default", bucketTs: 200}: {
			requestCount:   1,
			successCount:   1,
			totalLatencyMs: 150,
			ttftSumMs:      40,
			ttftCount:      1,
		},
	})

	if result.ModelName != "gpt-test" {
		t.Fatalf("ModelName = %q, want gpt-test", result.ModelName)
	}
	if result.SeriesSchema == "" {
		t.Fatal("SeriesSchema should be set")
	}
	if len(result.Groups) != 2 {
		t.Fatalf("len(Groups) = %d, want 2", len(result.Groups))
	}

	defaultGroup := result.Groups[0]
	if defaultGroup.Group != "default" {
		t.Fatalf("first group = %q, want default", defaultGroup.Group)
	}
	if defaultGroup.AvgLatencyMs != 150 {
		t.Fatalf("default AvgLatencyMs = %d, want 150", defaultGroup.AvgLatencyMs)
	}
	if defaultGroup.AvgTtftMs != 53 {
		t.Fatalf("default AvgTtftMs = %d, want 53", defaultGroup.AvgTtftMs)
	}
	if defaultGroup.SuccessRate != float64(2)/float64(3)*100 {
		t.Fatalf("default SuccessRate = %f, want %f", defaultGroup.SuccessRate, float64(2)/float64(3)*100)
	}
	if len(defaultGroup.Series) != 2 {
		t.Fatalf("default series len = %d, want 2", len(defaultGroup.Series))
	}
	if defaultGroup.Series[0].AvgTps != 50 {
		t.Fatalf("first bucket AvgTps = %f, want 50", defaultGroup.Series[0].AvgTps)
	}

	vipGroup := result.Groups[1]
	if vipGroup.Group != "vip" {
		t.Fatalf("second group = %q, want vip", vipGroup.Group)
	}
	if vipGroup.AvgTps != 20 {
		t.Fatalf("vip AvgTps = %f, want 20", vipGroup.AvgTps)
	}
}
