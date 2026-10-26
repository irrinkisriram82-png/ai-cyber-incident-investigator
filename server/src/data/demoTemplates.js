// Curated, FICTIONAL demo incidents used when Gemini is unavailable (or by choice).
// Everything is synthetic: invented organisations and people, documentation IP ranges
// (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) and reserved example domains.
//
// Each template is richer than any single difficulty needs. `tier` controls where an
// item appears:   tier 1 -> all difficulties,  tier 2 -> medium + hard,  tier 3 -> hard only.
// demoCaseService.js derives the Easy / Medium / Hard variants from these templates and
// the test-suite validates every derived variant with the same schema used for Gemini.

export const DEMO_TEMPLATES = [
  // ---------------------------------------------------------------------------
  // 1. suspicious_login -> credential_stuffing
  // ---------------------------------------------------------------------------
  {
    category: 'suspicious_login',
    title: 'Overnight Logins at the Student Portal',
    summary:
      'The student portal raised several authentication alerts overnight. Hours later, financial-aid staff received a complaint about changed bank details. Reconstruct what happened and why.',
    organization: {
      name: 'Lakeview Regional University',
      industry: 'Higher education',
      description:
        'A mid-sized fictional university whose students manage tuition, grades and financial aid through a self-service web portal.',
    },
    objectives: [
      'Decide how the overnight logins were carried out',
      'Identify the underlying reason the logins succeeded',
      'Work out where the activity entered the university systems',
    ],
    events: [
      { tier: 1, id: 'evt-01', timestamp: '2026-03-09T02:10:05Z', source: 'waf', severity: 'info', summary: 'Normal portal traffic: roughly 40 logins per hour, mostly from campus address ranges.', details: '' },
      { tier: 2, id: 'evt-02', timestamp: '2026-03-09T02:41:30Z', source: 'portal-auth', severity: 'low', summary: 'Password reset completed by user m.ortiz from a previously seen device.', details: '' },
      { tier: 1, id: 'evt-03', timestamp: '2026-03-09T03:02:11Z', source: 'portal-auth', severity: 'medium', summary: '38 failed logins from 203.0.113.45 in four minutes, exactly one failure for each of 38 different usernames.', details: 'Failures are spread across usernames in no alphabetical order.' },
      { tier: 1, id: 'evt-04', timestamp: '2026-03-09T03:05:47Z', source: 'portal-auth', severity: 'high', summary: 'Six successful logins from 203.0.113.45, each on the first attempt for that account.', details: '' },
      { tier: 3, id: 'evt-05', timestamp: '2026-03-09T03:12:20Z', source: 'waf', severity: 'low', summary: 'Internal scanner 198.51.100.7 requested /status as part of its scheduled scan.', details: '' },
      { tier: 1, id: 'evt-06', timestamp: '2026-03-09T03:20:09Z', source: 'portal-app', severity: 'high', summary: 'Session from 203.0.113.45 opened Financial Aid > Bank Details for user a.chen.', details: '' },
      { tier: 2, id: 'evt-07', timestamp: '2026-03-09T03:22:41Z', source: 'mail-gateway', severity: 'low', summary: 'Routine campus newsletter delivered to 1,200 student mailboxes.', details: '' },
      { tier: 1, id: 'evt-08', timestamp: '2026-03-09T03:31:55Z', source: 'portal-app', severity: 'high', summary: 'Bank-details change submitted from 203.0.113.45 for user a.chen.', details: '' },
      { tier: 3, id: 'evt-09', timestamp: '2026-03-09T03:40:02Z', source: 'vpn-gateway', severity: 'info', summary: 'Staff VPN login from 192.0.2.33 by a.novak during a scheduled shift.', details: '' },
      { tier: 1, id: 'evt-10', timestamp: '2026-03-09T07:15:30Z', source: 'helpdesk', severity: 'medium', summary: 'Student a.chen reports an unexpected email saying bank details were changed.', details: '' },
      { tier: 2, id: 'evt-11', timestamp: '2026-03-09T07:52:18Z', source: 'portal-auth', severity: 'medium', summary: 'Account lockout for user r.gomez after five failed attempts from campus Wi-Fi.', details: '' },
      { tier: 3, id: 'evt-12', timestamp: '2026-03-09T08:05:13Z', source: 'waf', severity: 'medium', summary: 'Rate-limit rule applied to 203.0.113.45 by a SOC analyst.', details: '' },
    ],
    evidence: [
      {
        tier: 1, id: 'ev-01', title: 'Authentication log: failed-login burst', type: 'log_excerpt',
        description:
          'Between 03:02 and 03:06, 203.0.113.45 attempted 38 distinct usernames. Every username was tried exactly once; no username was retried. All requests used the user-agent "python-requests".',
        relatedEventIds: ['evt-03'],
      },
      {
        tier: 1, id: 'ev-02', title: 'Authentication log: successful logins', type: 'log_excerpt',
        description:
          'Six of the 38 attempts succeeded on the very first try for that account. The accounts that succeeded had no failed attempt before the success.',
        relatedEventIds: ['evt-04'],
      },
      {
        tier: 1, id: 'ev-03', title: 'Helpdesk interview notes', type: 'user_report',
        description:
          'Three of the six affected students told the helpdesk they use the same password for the portal and for a personal shopping site that announced a data breach last month.',
        relatedEventIds: ['evt-04', 'evt-10'],
      },
      {
        tier: 1, id: 'ev-04', title: 'WAF request pattern', type: 'network_record',
        description:
          'All 38 requests had identical headers and were spaced about six seconds apart. The source address belongs to a commercial proxy range.',
        relatedEventIds: ['evt-03'],
      },
      {
        tier: 2, id: 'ev-05', title: 'Lockout record for r.gomez', type: 'alert',
        description:
          'Five failed attempts against a single account from the campus Wi-Fi. The student returned from vacation and had forgotten the password; a reset fixed it.',
        relatedEventIds: ['evt-11'],
      },
      {
        tier: 2, id: 'ev-06', title: 'Password reset record for m.ortiz', type: 'log_excerpt',
        description:
          'A reset link was requested and used from a device the account has used for months. The user confirmed the reset.',
        relatedEventIds: ['evt-02'],
      },
      {
        tier: 3, id: 'ev-07', title: 'Internal scanner schedule', type: 'config_snapshot',
        description:
          'The security team scans the portal weekly from 198.51.100.7. The 03:12 request matches the published schedule.',
        relatedEventIds: ['evt-05'],
      },
      {
        tier: 3, id: 'ev-08', title: 'Staff VPN session record', type: 'log_excerpt',
        description:
          'Staff member a.novak signed in from the usual address during the scheduled shift. No sensitive pages were opened.',
        relatedEventIds: ['evt-09'],
      },
    ],
    answerKey: {
      classification: 'credential_stuffing',
      rootCause: 'weak_or_reused_password',
      entryPoint: 'web_application',
      rootCauseExplanation:
        'The attacker tried each username once with a password taken from an unrelated breach. The logins succeeded on the first attempt because affected students had reused that password on the portal.',
      keyEvidenceIds: ['ev-01', 'ev-02', 'ev-03'],
      attackChainEventIds: ['evt-03', 'evt-04', 'evt-06', 'evt-08'],
    },
    hints: [
      { level: 1, text: 'Compare how many times each username was tried. Does the pattern look like guessing one account, or testing many accounts once each?' },
      { level: 2, text: 'When an account was accessed, how many attempts did it take? Think about where a correct first-try password could have come from.' },
      { level: 3, text: 'Read what the helpdesk learned about where affected students use the same password. Which habit made those logins work?' },
    ],
    explanation:
      'An automated tool tried one username and one password per account against the portal, using credentials from an unrelated breach. Because several students reused that password, six logins succeeded on the first try, and the attacker changed one student\'s bank details. A brute-force attack would have shown many attempts against few accounts instead.',
    recommendations: [
      'Require multi-factor authentication for all student and staff portal sign-ins.',
      'Check new and existing passwords against lists of known breached passwords.',
      'Rate-limit and alert on many distinct usernames failing from one source address.',
      'Send a confirmation step to a verified channel before bank details can be changed.',
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. phishing_simulation -> phishing_credential_harvest
  // ---------------------------------------------------------------------------
  {
    category: 'phishing_simulation',
    title: 'The Mailbox Storage Notice',
    summary:
      'Several employees received an email about their mailbox storage. Later that morning, one employee noticed that some invoice emails had gone missing. Work out how the account was compromised.',
    organization: {
      name: 'Harborview Logistics',
      industry: 'Freight and logistics',
      description:
        'A fictional regional freight company whose finance team exchanges supplier invoices by email every day.',
    },
    objectives: [
      'Determine what kind of attack reached the employee',
      'Find the action that gave the attacker access',
      'Identify the channel the attack arrived through',
    ],
    events: [
      { tier: 1, id: 'evt-01', timestamp: '2026-03-12T08:55:12Z', source: 'mail-gateway', severity: 'medium', summary: `Email "Action required: mailbox storage full" delivered to 14 staff from storage-notice@harborview-it-support.example.net.`, details: '' },
      { tier: 2, id: 'evt-02', timestamp: '2026-03-12T09:01:40Z', source: 'mail-gateway', severity: 'low', summary: 'Supplier newsletter from vendor-news@example.org delivered to 220 staff.', details: '' },
      { tier: 1, id: 'evt-03', timestamp: '2026-03-12T09:14:03Z', source: 'web-proxy', severity: 'medium', summary: 'User d.fischer opened https://harborview-mailbox-verify.example.net/login (category: uncategorised).', details: '' },
      { tier: 1, id: 'evt-04', timestamp: '2026-03-12T09:14:51Z', source: 'web-proxy', severity: 'high', summary: 'Form submission (POST, 118 bytes) from d.fischer workstation to harborview-mailbox-verify.example.net/login.', details: '' },
      { tier: 2, id: 'evt-05', timestamp: '2026-03-12T09:20:15Z', source: 'endpoint-av', severity: 'low', summary: 'Antivirus quarantined an adware browser toolbar on workstation WS-0417.', details: '' },
      { tier: 1, id: 'evt-06', timestamp: '2026-03-12T10:02:37Z', source: 'mail-auth', severity: 'high', summary: 'Mailbox sign-in for d.fischer from 198.51.100.88, a hosting-provider range not seen before for this user.', details: '' },
      { tier: 1, id: 'evt-07', timestamp: '2026-03-12T10:09:22Z', source: 'mail-audit', severity: 'high', summary: `Inbox rule created on d.fischer's mailbox forwarding messages containing "invoice" to an external address.`, details: '' },
      { tier: 3, id: 'evt-08', timestamp: '2026-03-12T10:30:00Z', source: 'mail-gateway', severity: 'info', summary: 'Spam-filter signature update applied.', details: '' },
      { tier: 2, id: 'evt-09', timestamp: '2026-03-12T10:48:19Z', source: 'mail-gateway', severity: 'medium', summary: 'Three other staff used the Report Message button on the "storage full" email.', details: '' },
      { tier: 1, id: 'evt-10', timestamp: '2026-03-12T11:05:44Z', source: 'helpdesk', severity: 'medium', summary: 'd.fischer reports that several invoice emails seem to be missing from the inbox.', details: '' },
      { tier: 3, id: 'evt-11', timestamp: '2026-03-12T11:40:30Z', source: 'vpn-gateway', severity: 'low', summary: 'Failed VPN login for contractor account c.mehta because the password had expired.', details: '' },
      { tier: 3, id: 'evt-12', timestamp: '2026-03-12T12:15:09Z', source: 'soc', severity: 'medium', summary: `Forwarding rule removed and d.fischer's password reset by the SOC.`, details: '' },
    ],
    evidence: [
      {
        tier: 1, id: 'ev-01', title: 'Email header of the storage notice', type: 'email_header',
        description:
          'From: "IT Support" <storage-notice@harborview-it-support.example.net>. SPF: fail. DKIM: none. The link text reads "Verify mailbox" but points to harborview-mailbox-verify.example.net. The real IT domain is not used anywhere in the message.',
        relatedEventIds: ['evt-01'],
      },
      {
        tier: 1, id: 'ev-02', title: 'Web-proxy record for d.fischer', type: 'network_record',
        description:
          'The user opened the verification page and submitted a form 48 seconds later. The domain was registered two days ago and imitates the company mail login page.',
        relatedEventIds: ['evt-03', 'evt-04'],
      },
      {
        tier: 1, id: 'ev-03', title: 'Mailbox sign-in log', type: 'log_excerpt',
        description:
          'The first sign-in from 198.51.100.88 occurred 48 minutes after the form submission. The user normally signs in from the Harborview office only.',
        relatedEventIds: ['evt-06'],
      },
      {
        tier: 1, id: 'ev-04', title: 'Inbox rule details', type: 'config_snapshot',
        description:
          'The forwarding rule matches messages containing "invoice" and sends copies to an external address. It was created from 198.51.100.88, the same address as the unusual sign-in.',
        relatedEventIds: ['evt-07'],
      },
      {
        tier: 2, id: 'ev-05', title: 'Antivirus quarantine report', type: 'alert',
        description:
          'The adware toolbar on WS-0417 belongs to a different user, a.sousa. It tracks browsing for advertising and has no link to the mailbox activity.',
        relatedEventIds: ['evt-05'],
      },
      {
        tier: 2, id: 'ev-06', title: 'Report Message submissions', type: 'user_report',
        description:
          'Three employees reported the same "storage full" email and did not click the link. All three were told to delete it.',
        relatedEventIds: ['evt-09'],
      },
      {
        tier: 3, id: 'ev-07', title: 'Contractor VPN failure', type: 'log_excerpt',
        description:
          'The contractor account failed once because of an expired password and succeeded after a reset. The activity is unrelated to the mailbox compromise.',
        relatedEventIds: ['evt-11'],
      },
      {
        tier: 3, id: 'ev-08', title: 'Spam-filter changelog', type: 'config_snapshot',
        description:
          'A routine vendor signature update was applied at 10:30. It did not change how messages from the sender domain were handled.',
        relatedEventIds: ['evt-08'],
      },
    ],
    answerKey: {
      classification: 'phishing_credential_harvest',
      rootCause: 'phishing_link_clicked',
      entryPoint: 'email',
      rootCauseExplanation:
        'The employee followed a link in a deceptive email and entered credentials on a look-alike login page. The attacker then used those credentials to sign in and set up an inbox forwarding rule.',
      keyEvidenceIds: ['ev-01', 'ev-02', 'ev-03'],
      attackChainEventIds: ['evt-01', 'evt-03', 'evt-04', 'evt-06', 'evt-07'],
    },
    hints: [
      { level: 1, text: `Start with the first message in the chain. Who really sent it, and does the sender's domain match the company's?` },
      { level: 2, text: 'Look at what the user did within a minute of opening the web page. What kind of request did the proxy record?' },
      { level: 3, text: 'Compare the time of the first sign-in from a new location with the moment the form was submitted. What does that gap suggest happened to the login details?' },
    ],
    explanation:
      'A deceptive email led an employee to a look-alike login page where the credentials were entered. Within an hour the attacker signed in from an unfamiliar hosting address and created a rule to forward invoice emails externally, which is a common step before invoice fraud.',
    recommendations: [
      'Enforce multi-factor authentication on all mailboxes so stolen passwords are not enough.',
      'Block or warn on newly registered and look-alike domains at the web proxy.',
      'Alert on new inbox forwarding rules that send mail to external addresses.',
      'Train staff to report unexpected account notices instead of following their links.',
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. data_exposure -> public_storage_misconfiguration
  // ---------------------------------------------------------------------------
  {
    category: 'data_exposure',
    title: 'Quarterly Exports in the Open',
    summary:
      'An outside researcher reported that company export files could be reached without signing in. Reconstruct how the files became reachable and who accessed them.',
    organization: {
      name: 'Cedar Retail Co.',
      industry: 'Retail',
      description:
        'A fictional retail chain that stores quarterly sales exports in cloud storage for its reporting dashboard.',
    },
    objectives: [
      'Classify the type of incident',
      'Find the change that made the files reachable',
      'Identify which part of the environment was exposed',
    ],
    events: [
      { tier: 1, id: 'evt-01', timestamp: '2026-03-18T09:03:10Z', source: 'cloud-audit', severity: 'info', summary: `Storage container "cedar-exports" created for quarterly sales reports (access: private).`, details: '' },
      { tier: 2, id: 'evt-02', timestamp: '2026-03-18T09:20:44Z', source: 'iam', severity: 'low', summary: 'Read-only analyst role granted to l.moreno for the reporting dashboard.', details: '' },
      { tier: 1, id: 'evt-03', timestamp: '2026-03-18T10:11:58Z', source: 'ci-pipeline', severity: 'medium', summary: `Pipeline build 482 applied a storage template change to "cedar-exports".`, details: '' },
      { tier: 1, id: 'evt-04', timestamp: '2026-03-18T10:12:31Z', source: 'cloud-audit', severity: 'high', summary: `Access policy on "cedar-exports" changed: public read enabled for all principals.`, details: '' },
      { tier: 3, id: 'evt-05', timestamp: '2026-03-18T10:45:12Z', source: 'monitoring', severity: 'info', summary: `Daily backup job completed for "cedar-archive".`, details: '' },
      { tier: 1, id: 'evt-06', timestamp: '2026-03-18T14:22:05Z', source: 'storage-access', severity: 'high', summary: `Anonymous list-objects request on "cedar-exports" from 203.0.113.9.`, details: '' },
      { tier: 2, id: 'evt-07', timestamp: '2026-03-18T14:30:41Z', source: 'waf', severity: 'low', summary: 'Marketing site traffic rose 18% during a social-media campaign.', details: '' },
      { tier: 1, id: 'evt-08', timestamp: '2026-03-18T14:37:19Z', source: 'storage-access', severity: 'critical', summary: `Anonymous download of 212 objects from "cedar-exports" by 203.0.113.9 over six minutes.`, details: '' },
      { tier: 3, id: 'evt-09', timestamp: '2026-03-18T15:02:33Z', source: 'iam', severity: 'medium', summary: `Failed sign-in for service account "report-bot" because its access key expired.`, details: '' },
      { tier: 1, id: 'evt-10', timestamp: '2026-03-18T16:40:02Z', source: 'security-inbox', severity: 'high', summary: 'Report received from an external researcher: customer export files reachable without signing in.', details: '' },
      { tier: 2, id: 'evt-11', timestamp: '2026-03-18T16:55:10Z', source: 'cloud-audit', severity: 'medium', summary: `Access policy on "cedar-exports" reverted to private by the SOC.`, details: '' },
      { tier: 3, id: 'evt-12', timestamp: '2026-03-18T17:30:00Z', source: 'finance', severity: 'info', summary: 'Month-end report job scheduled for 18:00.', details: '' },
    ],
    evidence: [
      {
        tier: 1, id: 'ev-01', title: 'Access-policy change record', type: 'config_snapshot',
        description:
          `Policy diff for "cedar-exports". Before: principals = [analyst-readonly]. After: principals = ["*"], actions = [read, list]. Change author: deploy-bot (pipeline).`,
        relatedEventIds: ['evt-04'],
      },
      {
        tier: 1, id: 'ev-02', title: 'Storage access log', type: 'log_excerpt',
        description:
          'Requests from 203.0.113.9 carry no authenticated identity. One list request was followed by 212 download requests. There were no authentication failures.',
        relatedEventIds: ['evt-06', 'evt-08'],
      },
      {
        tier: 1, id: 'ev-03', title: 'Pipeline log for build 482', type: 'log_excerpt',
        description:
          `The template change introduced the line public_access = true under the commit message "quick fix for dashboard link". The peer-review step was skipped because the build used the hotfix flag.`,
        relatedEventIds: ['evt-03'],
      },
      {
        tier: 1, id: 'ev-04', title: 'External researcher report', type: 'user_report',
        description:
          'The researcher listed object names, confirmed the files opened without a login, and did not publish any data. They asked for a confirmation of receipt.',
        relatedEventIds: ['evt-10'],
      },
      {
        tier: 2, id: 'ev-05', title: 'Marketing analytics note', type: 'alert',
        description:
          'The traffic increase came from the public website and its campaign pages. It did not touch the storage container.',
        relatedEventIds: ['evt-07'],
      },
      {
        tier: 2, id: 'ev-06', title: 'Analyst role definition', type: 'config_snapshot',
        description:
          'The analyst-readonly role allows viewing dashboards only. It has no permission to read the export container directly or to change its access policy.',
        relatedEventIds: ['evt-02'],
      },
      {
        tier: 3, id: 'ev-07', title: 'Service account failure', type: 'log_excerpt',
        description:
          'The report-bot sign-in failed because its key had expired at midnight. The key was rotated afterwards. No data was read by this account.',
        relatedEventIds: ['evt-09'],
      },
      {
        tier: 3, id: 'ev-08', title: 'Backup job log', type: 'log_excerpt',
        description:
          'The archive backup completed normally and only touches the separate archive container, not the exports container.',
        relatedEventIds: ['evt-05'],
      },
    ],
    answerKey: {
      classification: 'public_storage_misconfiguration',
      rootCause: 'storage_acl_misconfigured',
      entryPoint: 'cloud_storage',
      rootCauseExplanation:
        'A pipeline change set the storage access policy to public read without review. Anyone on the internet could then list and download the export files without signing in.',
      keyEvidenceIds: ['ev-01', 'ev-02', 'ev-03'],
      attackChainEventIds: ['evt-03', 'evt-04', 'evt-06', 'evt-08'],
    },
    hints: [
      { level: 1, text: 'Find who or what made the change that opened access, and compare the policy before and after.' },
      { level: 2, text: 'Look at who was requesting the files. Was any signed-in identity attached to those requests?' },
      { level: 3, text: 'Trace the policy change back to its source in the deployment record. Which review step is missing?' },
    ],
    explanation:
      'A deployment template switched the storage container to public read. Within hours an unknown address listed and downloaded the files without authentication, and an outside researcher reported the exposure. The data was exposed by a configuration error, not by a stolen account.',
    recommendations: [
      'Block public access at the storage-account level unless explicitly approved.',
      'Require peer review for infrastructure templates, including hotfixes.',
      'Alert immediately when a storage policy grants access to all principals.',
      'Publish a security contact so researchers can report problems quickly.',
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. malware_alert_simulation -> malware_beaconing
  // ---------------------------------------------------------------------------
  {
    category: 'malware_alert_simulation',
    title: 'The Quiet Connection from WS-0233',
    summary:
      'The firewall flagged an unusual outbound pattern from an engineering workstation. Investigate what the workstation was doing and how it got into that state.',
    organization: {
      name: 'Quayside Engineering Ltd',
      industry: 'Civil engineering',
      description:
        'A fictional engineering consultancy whose staff open supplier documents and CAD files on managed Windows workstations.',
    },
    objectives: [
      'Classify the activity seen on the workstation',
      'Establish why the workstation could be abused',
      'Identify the part of the environment the activity started from',
    ],
    events: [
      { tier: 1, id: 'evt-01', timestamp: '2026-03-24T08:30:00Z', source: 'patch-mgmt', severity: 'info', summary: 'Patch compliance report: 14 workstations pending a document-viewer update (change freeze until 1 April).', details: '' },
      { tier: 2, id: 'evt-02', timestamp: '2026-03-24T09:05:22Z', source: 'endpoint-av', severity: 'low', summary: 'Scheduled quick scan completed on WS-0233 with no threats found.', details: '' },
      { tier: 1, id: 'evt-03', timestamp: '2026-03-24T09:41:18Z', source: 'endpoint-edr', severity: 'medium', summary: `WS-0233: DocViewer 9.1 crashed and restarted while opening "Q1_supplier_terms.pdf" downloaded from a supplier portal.`, details: '' },
      { tier: 1, id: 'evt-04', timestamp: '2026-03-24T09:41:44Z', source: 'endpoint-edr', severity: 'high', summary: `WS-0233: DocViewer started an unexpected child process "svc_update.exe" from the user temp folder.`, details: '' },
      { tier: 1, id: 'evt-05', timestamp: '2026-03-24T09:43:02Z', source: 'firewall', severity: 'medium', summary: 'WS-0233 opened an outbound connection to 198.51.100.77:443, never seen before from this host.', details: '' },
      { tier: 1, id: 'evt-06', timestamp: '2026-03-24T09:44:03Z', source: 'firewall', severity: 'high', summary: 'WS-0233 connected to 198.51.100.77:443 again, repeating at 60-second intervals with 245-byte payloads.', details: '' },
      { tier: 2, id: 'evt-07', timestamp: '2026-03-24T10:15:40Z', source: 'proxy', severity: 'low', summary: 'Engineering staff downloaded a CAD plugin update from the vendor site (allowed category).', details: '' },
      { tier: 3, id: 'evt-08', timestamp: '2026-03-24T10:50:12Z', source: 'endpoint-edr', severity: 'low', summary: 'WS-0114: scheduled disk defragmentation started.', details: '' },
      { tier: 1, id: 'evt-09', timestamp: '2026-03-24T11:30:25Z', source: 'soc', severity: 'medium', summary: 'SOC analyst opened a triage ticket for the periodic outbound pattern from WS-0233.', details: '' },
      { tier: 2, id: 'evt-10', timestamp: '2026-03-24T11:45:09Z', source: 'firewall', severity: 'low', summary: 'WS-0090 contacted the software update server 203.0.113.80 (allowed vendor).', details: '' },
      { tier: 3, id: 'evt-11', timestamp: '2026-03-24T12:20:31Z', source: 'dns', severity: 'medium', summary: `A single DNS lookup for the rarely seen domain cdn-metrics.example.net came from WS-0301.`, details: '' },
      { tier: 3, id: 'evt-12', timestamp: '2026-03-24T13:00:00Z', source: 'soc', severity: 'info', summary: 'WS-0233 isolated from the network pending forensic imaging.', details: '' },
    ],
    evidence: [
      {
        tier: 1, id: 'ev-01', title: 'Patch compliance record for WS-0233', type: 'config_snapshot',
        description:
          'DocViewer 9.1 is installed. The vendor published version 9.3 on 20 February to fix a known document-parsing vulnerability. Deployment was deferred by the change freeze.',
        relatedEventIds: ['evt-01', 'evt-03'],
      },
      {
        tier: 1, id: 'ev-02', title: 'Endpoint alert: unexpected child process', type: 'alert',
        description:
          'DocViewer.exe started svc_update.exe from the temp folder. The new process is unsigned. DocViewer normally never starts other programs.',
        relatedEventIds: ['evt-04'],
      },
      {
        tier: 1, id: 'ev-03', title: 'Firewall flow summary for WS-0233', type: 'network_record',
        description:
          'WS-0233 contacted 198.51.100.77:443 every 60 seconds (plus or minus one second) with 245-byte payloads, 52 connections so far. The destination is on no allow-list.',
        relatedEventIds: ['evt-05', 'evt-06'],
      },
      {
        tier: 1, id: 'ev-04', title: 'Download record for the PDF', type: 'log_excerpt',
        description:
          `The file was fetched over HTTPS by user e.walsh at 09:40 from a supplier portal. Its hash is not in any known-file database and was marked "unknown".`,
        relatedEventIds: ['evt-03'],
      },
      {
        tier: 2, id: 'ev-05', title: 'Firewall record for WS-0090', type: 'network_record',
        description:
          'WS-0090 checks for updates every 60 minutes with signed traffic to a vendor server that is on the allow-list. It is periodic but expected.',
        relatedEventIds: ['evt-10'],
      },
      {
        tier: 2, id: 'ev-06', title: 'Proxy log for the CAD plugin', type: 'log_excerpt',
        description:
          'The CAD plugin download came from the vendor domain and carries a valid vendor signature. Several staff downloaded it during the morning.',
        relatedEventIds: ['evt-07'],
      },
      {
        tier: 3, id: 'ev-07', title: 'DNS log for WS-0301', type: 'log_excerpt',
        description:
          'One lookup was made and no connection followed. The domain belongs to a web-analytics script loaded by a news site the user visited.',
        relatedEventIds: ['evt-11'],
      },
      {
        tier: 3, id: 'ev-08', title: 'Maintenance schedule for WS-0114', type: 'config_snapshot',
        description:
          'Disk defragmentation runs on engineering workstations every Tuesday at 10:50 and is part of normal maintenance.',
        relatedEventIds: ['evt-08'],
      },
    ],
    answerKey: {
      classification: 'malware_beaconing',
      rootCause: 'unpatched_software',
      entryPoint: 'endpoint_workstation',
      rootCauseExplanation:
        'A document opened in an outdated viewer triggered a known flaw that started an unsigned program. That program then contacted an external address on a fixed 60-second schedule, which is typical beaconing.',
      keyEvidenceIds: ['ev-01', 'ev-02', 'ev-03'],
      attackChainEventIds: ['evt-03', 'evt-04', 'evt-05', 'evt-06'],
    },
    hints: [
      { level: 1, text: 'Look for a process that started something it normally never starts, then follow what the new process did on the network.' },
      { level: 2, text: 'Compare the timing of the outbound connections. Are they uneven like human browsing, or evenly spaced like a timer?' },
      { level: 3, text: `Ask how the first program could have been abused. Compare its version with the vendor's fix date and your patch records.` },
    ],
    explanation:
      `A supplier document triggered a known flaw in an outdated document viewer. The viewer started an unsigned program, which began contacting an external address every minute. The fixed interval and tiny payloads match command-and-control beaconing. The flaw had a published fix that a change freeze had delayed.`,
    recommendations: [
      'Allow emergency patching of exploited software during change freezes.',
      'Restrict outbound traffic to approved destinations and alert on new ones.',
      'Alert when document viewers start child processes from temporary folders.',
      'Isolate suspect workstations quickly and image them before cleanup.',
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. insider_access_anomaly -> insider_privilege_misuse
  // ---------------------------------------------------------------------------
  {
    category: 'insider_access_anomaly',
    title: 'After-Hours Queries on the Finance Database',
    summary:
      'An audit alert flagged unusual database activity by an employee who recently changed teams. Review the records and decide what kind of activity this was.',
    organization: {
      name: 'Summit Ridge Insurance',
      industry: 'Insurance',
      description:
        'A fictional insurer whose finance database holds payroll and executive compensation data used by a small, specialised team.',
    },
    objectives: [
      'Classify the insider activity',
      'Establish why the employee could reach the data',
      'Identify the kind of access that was used',
    ],
    events: [
      { tier: 1, id: 'evt-01', timestamp: '2026-03-30T09:00:00Z', source: 'hr-system', severity: 'info', summary: 'Employee t.baker transferred from Finance Systems to Customer Support, effective today.', details: '' },
      { tier: 2, id: 'evt-02', timestamp: '2026-03-30T09:30:12Z', source: 'iam', severity: 'low', summary: 'Quarterly access review scheduled for 15 April.', details: '' },
      { tier: 1, id: 'evt-03', timestamp: '2026-03-30T09:45:50Z', source: 'iam', severity: 'medium', summary: `Role assignments for t.baker unchanged after the transfer: "finance-db-admin" is still active.`, details: '' },
      { tier: 3, id: 'evt-04', timestamp: '2026-03-30T13:10:05Z', source: 'helpdesk', severity: 'info', summary: 't.baker changed their password through self-service (normal 90-day rotation).', details: '' },
      { tier: 1, id: 'evt-05', timestamp: '2026-03-30T22:47:31Z', source: 'finance-db', severity: 'high', summary: 't.baker ran 41 queries on the executive compensation table in 12 minutes, outside business hours.', details: '' },
      { tier: 2, id: 'evt-06', timestamp: '2026-03-30T23:05:14Z', source: 'vpn-gateway', severity: 'low', summary: 't.baker connected through the VPN from home address 192.0.2.120 (usual location).', details: '' },
      { tier: 1, id: 'evt-07', timestamp: '2026-03-30T23:21:09Z', source: 'finance-db', severity: 'high', summary: `t.baker granted themselves read access to the "payroll-restricted" schema.`, details: '' },
      { tier: 3, id: 'evt-08', timestamp: '2026-03-31T02:00:00Z', source: 'backup', severity: 'info', summary: 'Nightly database backup completed.', details: '' },
      { tier: 1, id: 'evt-09', timestamp: '2026-03-31T08:12:44Z', source: 'dlp', severity: 'info', summary: 'DLP scan found no outbound transfers of finance data linked to t.baker in the last 24 hours.', details: '' },
      { tier: 2, id: 'evt-10', timestamp: '2026-03-31T08:50:00Z', source: 'audit', severity: 'medium', summary: 'Audit alert: privileged query volume above baseline for account t.baker.', details: '' },
      { tier: 3, id: 'evt-11', timestamp: '2026-03-31T09:15:33Z', source: 'cloud-sync', severity: 'low', summary: `t.baker's laptop synced 120 MB to the company-approved cloud drive.`, details: '' },
      { tier: 1, id: 'evt-12', timestamp: '2026-03-31T10:30:00Z', source: 'security', severity: 'medium', summary: 'Manager confirms t.baker has had no job need for finance data since the transfer.', details: '' },
    ],
    evidence: [
      {
        tier: 1, id: 'ev-01', title: 'Role assignment export for t.baker', type: 'config_snapshot',
        description:
          'Roles: finance-db-admin (granted June 2025, no expiry) and support-agent (granted today). The transfer workflow has no task for removing old access.',
        relatedEventIds: ['evt-03'],
      },
      {
        tier: 1, id: 'ev-02', title: 'Finance database audit: compensation queries', type: 'log_excerpt',
        description:
          'Forty-one SELECT queries on the executive compensation table between 22:47 and 22:59, none with a ticket reference. The queries ran under the finance-db-admin role, not the support role.',
        relatedEventIds: ['evt-05'],
      },
      {
        tier: 1, id: 'ev-03', title: 'Finance database audit: grant statement', type: 'log_excerpt',
        description:
          'At 23:21 the account t.baker ran a GRANT giving itself SELECT on the payroll-restricted schema. The statement was authorised by the finance-db-admin role.',
        relatedEventIds: ['evt-07'],
      },
      {
        tier: 1, id: 'ev-04', title: 'DLP summary for t.baker', type: 'log_excerpt',
        description:
          'No external uploads, USB writes or emails with attachments are linked to the finance-database activity. The records were viewed, and no copy left the company systems.',
        relatedEventIds: ['evt-09'],
      },
      {
        tier: 2, id: 'ev-05', title: 'Audit alert threshold', type: 'alert',
        description:
          'The alert fires when privileged queries exceed ten per hour. It is informational and gives no reason for the volume.',
        relatedEventIds: ['evt-10'],
      },
      {
        tier: 2, id: 'ev-06', title: 'VPN session record', type: 'network_record',
        description:
          'The VPN session came from the employee home address used regularly for remote work. No new device or location appears.',
        relatedEventIds: ['evt-06'],
      },
      {
        tier: 3, id: 'ev-07', title: 'Cloud-sync record', type: 'network_record',
        description:
          'The 120 MB sync contained support-team documents going to the approved company drive. No finance files were included.',
        relatedEventIds: ['evt-11'],
      },
      {
        tier: 3, id: 'ev-08', title: 'Self-service password change', type: 'log_excerpt',
        description:
          'The password change followed the 90-day rotation policy and was completed from the usual workstation.',
        relatedEventIds: ['evt-04'],
      },
    ],
    answerKey: {
      classification: 'insider_privilege_misuse',
      rootCause: 'excessive_permissions',
      entryPoint: 'internal_account',
      rootCauseExplanation:
        'The employee kept a powerful finance role after changing teams and used it to read sensitive records and widen their own access. Nothing shows the data leaving the company, so this is misuse of access, not exfiltration.',
      keyEvidenceIds: ['ev-01', 'ev-02', 'ev-03'],
      attackChainEventIds: ['evt-01', 'evt-03', 'evt-05', 'evt-07'],
    },
    hints: [
      { level: 1, text: `Check whether the person's access still matches their current job. Compare the date of the role change with their entitlements.` },
      { level: 2, text: 'Review what the account actually did in the database, and whether any of it was tied to a support ticket.' },
      { level: 3, text: 'Search the outbound-transfer records. Does anything show data leaving the company, or only data being viewed and access being widened?' },
    ],
    explanation:
      'After moving to Customer Support, the employee kept the finance administrator role. Late at night they read executive compensation records and granted themselves access to a restricted payroll schema. Data-loss monitoring found no outbound transfer, so the misuse was of access privileges rather than data theft.',
    recommendations: [
      'Remove or review access automatically whenever an employee changes teams.',
      'Add an expiry date to privileged roles and require periodic re-approval.',
      'Alert on self-granted privileges and on privileged access outside business hours.',
      'Require a ticket reference for queries on sensitive compensation tables.',
    ],
  },
];
