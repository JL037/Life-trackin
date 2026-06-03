package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// ResolveHandle resolves an AT Protocol handle to a DID
func ResolveHandle(ctx context.Context, handle string) (string, error) {
	// Try resolving via the default PDS (bsky.social)
	resolveURL := fmt.Sprintf("https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=%s",
		url.QueryEscape(handle))

	req, err := http.NewRequestWithContext(ctx, "GET", resolveURL, nil)
	if err != nil {
		return "", fmt.Errorf("creating resolve request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("resolving handle: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("resolve failed (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		DID string `json:"did"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decoding resolve response: %w", err)
	}

	return result.DID, nil
}

// GetPDSFromDID resolves a DID to its PDS endpoint
func GetPDSFromDID(ctx context.Context, did string) (string, error) {
	var docURL string
	if strings.HasPrefix(did, "did:plc:") {
		docURL = fmt.Sprintf("https://plc.directory/%s", did)
	} else if strings.HasPrefix(did, "did:web:") {
		domain := strings.TrimPrefix(did, "did:web:")
		docURL = fmt.Sprintf("https://%s/.well-known/did.json", domain)
	} else {
		return "", fmt.Errorf("unsupported DID method: %s", did)
	}

	req, err := http.NewRequestWithContext(ctx, "GET", docURL, nil)
	if err != nil {
		return "", fmt.Errorf("creating DID doc request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetching DID document: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("DID document fetch failed: status %d", resp.StatusCode)
	}

	var doc struct {
		Service []struct {
			ID              string `json:"id"`
			Type            string `json:"type"`
			ServiceEndpoint string `json:"serviceEndpoint"`
		} `json:"service"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return "", fmt.Errorf("decoding DID document: %w", err)
	}

	for _, svc := range doc.Service {
		if svc.ID == "#atproto_pds" || svc.Type == "AtprotoPersonalDataServer" {
			return svc.ServiceEndpoint, nil
		}
	}

	return "", fmt.Errorf("no PDS service found in DID document")
}

// GetAuthServerMetadata fetches the OAuth authorization server metadata from a PDS
func GetAuthServerMetadata(ctx context.Context, pdsURL string) (*AuthServerMeta, error) {
	metaURL := pdsURL + "/.well-known/oauth-authorization-server"

	req, err := http.NewRequestWithContext(ctx, "GET", metaURL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating metadata request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching auth server metadata: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("auth server metadata fetch failed: status %d", resp.StatusCode)
	}

	var meta AuthServerMeta
	if err := json.NewDecoder(resp.Body).Decode(&meta); err != nil {
		return nil, fmt.Errorf("decoding auth server metadata: %w", err)
	}

	return &meta, nil
}

type AuthServerMeta struct {
	Issuer                            string   `json:"issuer"`
	AuthorizationEndpoint             string   `json:"authorization_endpoint"`
	TokenEndpoint                     string   `json:"token_endpoint"`
	RevocationEndpoint                string   `json:"revocation_endpoint,omitempty"`
	PushedAuthorizationRequestEndpoint string  `json:"pushed_authorization_request_endpoint"`
	ScopesSupported                   []string `json:"scopes_supported"`
	ResponseTypesSupported            []string `json:"response_types_supported"`
	CodeChallengeMethodsSupported     []string `json:"code_challenge_methods_supported"`
	DPoPSigningAlgValuesSupported     []string `json:"dpop_signing_alg_values_supported"`
}
