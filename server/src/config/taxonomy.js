// Single source of truth for categories, classifications, root causes and entry points.
// IDs are stable machine values; labels are for display only.

export const CATEGORIES = [
  { id: 'suspicious_login', label: 'Suspicious login' },
  { id: 'phishing_simulation', label: 'Phishing simulation' },
  { id: 'data_exposure', label: 'Data exposure' },
  { id: 'malware_alert_simulation', label: 'Malware alert simulation' },
  { id: 'insider_access_anomaly', label: 'Insider-access anomaly' },
];

export const CLASSIFICATIONS = [
  { id: 'credential_stuffing', label: 'Credential stuffing' },
  { id: 'brute_force_login', label: 'Brute-force login attack' },
  { id: 'impossible_travel_takeover', label: 'Account takeover (impossible travel)' },
  { id: 'phishing_credential_harvest', label: 'Phishing – credential harvesting' },
  { id: 'phishing_malicious_attachment', label: 'Phishing – malicious attachment' },
  { id: 'public_storage_misconfiguration', label: 'Publicly exposed storage' },
  { id: 'excessive_data_export', label: 'Excessive data export' },
  { id: 'malware_beaconing', label: 'Malware command-and-control beaconing' },
  { id: 'ransomware_precursor', label: 'Ransomware precursor activity' },
  { id: 'insider_privilege_misuse', label: 'Insider privilege misuse' },
  { id: 'insider_data_exfiltration', label: 'Insider data exfiltration' },
];

// Which classifications are valid answers for which category.
export const CLASSIFICATIONS_BY_CATEGORY = {
  suspicious_login: ['credential_stuffing', 'brute_force_login', 'impossible_travel_takeover'],
  phishing_simulation: ['phishing_credential_harvest', 'phishing_malicious_attachment'],
  data_exposure: ['public_storage_misconfiguration', 'excessive_data_export'],
  malware_alert_simulation: ['malware_beaconing', 'ransomware_precursor'],
  insider_access_anomaly: ['insider_privilege_misuse', 'insider_data_exfiltration'],
};

export const ROOT_CAUSES = [
  { id: 'weak_or_reused_password', label: 'Weak or reused password' },
  { id: 'missing_mfa', label: 'Missing multi-factor authentication' },
  { id: 'phishing_link_clicked', label: 'User clicked a phishing link' },
  { id: 'malicious_attachment_opened', label: 'User opened a malicious attachment' },
  { id: 'storage_acl_misconfigured', label: 'Storage access policy misconfigured' },
  { id: 'excessive_permissions', label: 'Excessive permissions granted' },
  { id: 'unpatched_software', label: 'Unpatched software' },
  { id: 'missing_egress_monitoring', label: 'No outbound-traffic monitoring' },
  { id: 'shared_credentials', label: 'Shared credentials' },
];

export const ENTRY_POINTS = [
  { id: 'vpn_portal', label: 'VPN portal' },
  { id: 'email', label: 'Email' },
  { id: 'cloud_storage', label: 'Cloud storage' },
  { id: 'web_application', label: 'Web application' },
  { id: 'endpoint_workstation', label: 'Endpoint workstation' },
  { id: 'internal_account', label: 'Internal account' },
  { id: 'remote_desktop', label: 'Remote desktop service' },
  { id: 'third_party_integration', label: 'Third-party integration' },
];

export const EVIDENCE_TYPES = [
  'log_excerpt',
  'email_header',
  'alert',
  'user_report',
  'config_snapshot',
  'network_record',
];

export const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];

// Tuples for z.enum(...)
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const CLASSIFICATION_IDS = CLASSIFICATIONS.map((c) => c.id);
export const ROOT_CAUSE_IDS = ROOT_CAUSES.map((c) => c.id);
export const ENTRY_POINT_IDS = ENTRY_POINTS.map((c) => c.id);

const labelMaps = {
  classification: new Map(CLASSIFICATIONS.map((c) => [c.id, c.label])),
  rootCause: new Map(ROOT_CAUSES.map((c) => [c.id, c.label])),
  entryPoint: new Map(ENTRY_POINTS.map((c) => [c.id, c.label])),
  category: new Map(CATEGORIES.map((c) => [c.id, c.label])),
};

export function labelFor(kind, id) {
  return labelMaps[kind]?.get(id) ?? id;
}

// Public option lists. Identical for every case, so they never reveal an answer.
export function publicOptions() {
  return {
    classifications: CLASSIFICATIONS.map((c) => ({ ...c })),
    rootCauses: ROOT_CAUSES.map((c) => ({ ...c })),
    entryPoints: ENTRY_POINTS.map((c) => ({ ...c })),
  };
}
