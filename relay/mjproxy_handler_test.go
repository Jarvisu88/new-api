package relay

import (
	"net/http"
	"testing"
)

func TestIsMidjourneySubmitAccepted(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		code       int
		want       bool
	}{
		{name: "submitted", statusCode: http.StatusOK, code: 1, want: true},
		{name: "existing", statusCode: http.StatusOK, code: 21, want: true},
		{name: "queued", statusCode: http.StatusOK, code: 22, want: true},
		{name: "upstream rejected", statusCode: http.StatusOK, code: 24, want: false},
		{name: "http error", statusCode: http.StatusBadGateway, code: 1, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isMidjourneySubmitAccepted(tt.statusCode, tt.code); got != tt.want {
				t.Fatalf("isMidjourneySubmitAccepted(%d, %d) = %v, want %v", tt.statusCode, tt.code, got, tt.want)
			}
		})
	}
}
