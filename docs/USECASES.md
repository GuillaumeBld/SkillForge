# SkillForge - Core User Stories and Workflow Walkthroughs

## User Personas Walkthrough

### Student Persona – Maya (Community College Sophomore Exploring Tech Careers)

**Starting Conditions**
- Enrolled in a community college general studies program with limited exposure to technology careers.
- Owns an updated resume and unofficial transcript but is unsure which skills are marketable.
- Has basic familiarity with web applications and a personal laptop with internet access.

**User Goals**
- Identify high-potential career paths that match her interests in design and analytics.
- Understand the skills, courses, and extracurricular activities needed to become job-ready before graduation.
- Track progress toward internships and entry-level roles with clear milestones.

**Platform Touchpoints**
- Web application accessed through laptop; onboarding wizard, skills assessment tools, career exploration dashboards, and personal progress dashboard.
- Email notifications and in-app reminders for upcoming tasks.

**Workflow Steps**
1. **Account Creation & Guided Onboarding**  
   - *UI Interaction:* Maya registers with Google OAuth and completes the onboarding wizard to capture education level, interests, and goals.  
   - *Backend Interaction:* Authentication service creates user profile; onboarding service stores initial skill inventory (Features 1.1–1.3, 1.2 Onboarding Wizard).  
   - *Acceptance Criteria:* Registration succeeds with verified email; onboarding wizard collects required fields (education, career goal, baseline skills) and stores them in the profile.
2. **Resume Import & Skill Extraction**  
   - *UI Interaction:* Upload resume PDF through profile page; review parsed skills in a confirmation modal.  
   - *Backend Interaction:* Resume parsing service extracts skills, updates Skills Profile Dashboard, and tags proficiency defaults (Features 1.3, 2.1, 2.3).  
   - *Acceptance Criteria:* Upload supports PDF/DOCX; parsed skills appear grouped by category with edit option; system logs extraction results.
3. **Self-Assessment & Competency Check**  
   - *UI Interaction:* Completes recommended self-assessment modules for design thinking and data literacy.  
   - *Backend Interaction:* Assessment engine records scores, updates skill proficiency levels, and triggers readiness recalculation (Features 2.1–2.3, 6.2).  
   - *Acceptance Criteria:* Assessments saved even if session interrupted; readiness indicator updates within dashboard after completion.
4. **Career Exploration & Matching**  
   - *UI Interaction:* Browses Occupation Search for UX Researcher and Data Analyst; saves preferred roles.  
   - *Backend Interaction:* Matching engine generates compatibility scores, salary insights, and recommended pathways (Features 3.1–3.3, 4.1).  
   - *Acceptance Criteria:* Occupation cards display match score, salary ranges, and required skills; saved roles persist and feed recommendations.
5. **Action Plan & Progress Tracking**  
   - *UI Interaction:* Accepts suggested action plan including campus courses, online certificates, and portfolio tasks; views timeline in dashboard.  
   - *Backend Interaction:* Pathway planner stores tasks, deadlines, and notifies via reminders; progress metrics update as tasks are marked complete (Features 5.1–5.3, 6.1–6.3).  
   - *Acceptance Criteria:* Action plan exports to PDF/iCal; dashboard reflects completion percentages and sends reminders ahead of deadlines.

**Data Requirements**
- Personal and academic profile fields (name, major, credits earned).
- Resume or LinkedIn data for skill extraction.
- Assessment responses and scores stored per attempt.
- Saved occupations, action plan tasks, and completion timestamps.

**Success Criteria**
- Maya identifies at least two aligned occupations with match scores ≥70% and a fully populated action plan.  
- Skill readiness indicator improves semester over semester, and she completes 80% of planned tasks before internship application season.

**Failure Outcomes**
- Missing or invalid resume data prevents skill extraction; system must surface errors and allow re-upload.  
- If readiness score fails to update after assessments, QA flags sync issue between assessment engine and dashboard metrics.

---

### Career Changer Persona – James (Retail Store Manager Transitioning to Data Analytics)

**Starting Conditions**
- Ten years of multi-store retail management experience with strong leadership and operations background.
- Recently completed employer-sponsored Excel training; has partial familiarity with SQL but no formal analytics credential.
- Evaluating transition timeline and financial implications before committing to a career change.

**User Goals**
- Convert existing management experience into a data analytics narrative with minimal downtime.
- Understand educational investments (courses, certificates) and projected salary lift.
- Receive a month-by-month action plan and progress reminders to stay accountable.

**Platform Touchpoints**
- Desktop web app for onboarding, skills gap analysis, financial planning, and career pathway management.
- Email digest summarizing roadmap progress; optional SMS reminders for milestones.

**Workflow Steps**
1. **Automated Profile Initialization**  
   - *UI Interaction:* James uploads resume and links LinkedIn profile during onboarding.  
   - *Backend Interaction:* NLP parser extracts management, sales, and emerging analytics skills; profile service merges duplicate entries (Features 1.3, 2.3).  
   - *Acceptance Criteria:* Combined skill inventory reflects leadership, budgeting, Excel; duplicate detection prompts confirmation before merge.
2. **Goal Setting & Target Role Selection**  
   - *UI Interaction:* Uses Career Exploration wizard to evaluate Junior Data Analyst vs. Business Intelligence roles; selects Junior Data Analyst.  
   - *Backend Interaction:* Matching engine calculates compatibility, while pathway planner initializes baseline roadmap (Features 3.1–3.3, 4.1, 5.1).  
   - *Acceptance Criteria:* Selection persists across sessions; match score and top required skills display immediately.
3. **Skill Gap & Learning Recommendation Review**  
   - *UI Interaction:* Reviews gap visualization comparing current skills to target role; accepts recommended SQL and Python coursework bundle.  
   - *Backend Interaction:* Gap analysis service prioritizes critical skills; recommendation engine attaches course metadata (duration, cost) (Features 4.2–4.3).  
   - *Acceptance Criteria:* Visualization highlights transferables vs. critical gaps; recommendations include duration and estimated cost aligned with catalog data.
4. **Financial Planning & Wage Projection**  
   - *UI Interaction:* Inputs current salary ($45,000) and desired wage timeline to see ROI projections.  
   - *Backend Interaction:* Financial planner models wage progression (junior to senior analyst) and cost amortization (Features 5.2).  
   - *Acceptance Criteria:* Projection chart displays median, optimistic, pessimistic salary ranges; calculations exportable for personal budgeting.
5. **Action Plan Execution & Monitoring**  
   - *UI Interaction:* Accepts 12-month action plan with SQL (Months 1–2), Python (3–5), Visualization (6–8), Portfolio (9–10), Job Prep (11–12).  
   - *Backend Interaction:* Task scheduler issues reminders; dashboard tracks completion and interview preparation tasks (Features 5.3, 6.1–6.3, 7.2).  
   - *Acceptance Criteria:* Progress dashboard reflects completed coursework; reminders fire weekly; action plan export includes updated milestones.

**Data Requirements**
- Resume, LinkedIn skill endorsements, salary inputs, course completion data (manual or via integrations).
- Catalog metadata for recommended courses (duration, modality, provider, price).
- Wage projection assumptions (salary ranges by role/experience) referenced for ROI outputs.

**Success Criteria**
- Clear 12-month roadmap produced with aligned coursework, portfolio milestones, and job search tasks.  
- Wage projection indicates post-transition salary range of $55K–$65K within 18 months, matching James’s expectations.

**Failure Outcomes**
- If course provider data is missing, recommendations must flag incomplete metadata; QA verifies fallback messaging.  
- Action plan reminders failing to send weekly triggers alert to notification service.

---

### Career Advisor Persona – Alicia (University Career Advisor Managing 120 Students)

**Starting Conditions**
- Oversees diverse student caseload; currently tracking progress in spreadsheets and email threads.
- Needs consolidated visibility into student readiness metrics and follow-up tasks.
- Institution has enabled advisor portal integration with single sign-on.

**User Goals**
- Quickly onboard new advisees and prioritize interventions based on readiness gaps.
- Monitor action plan adherence and document advising notes within the platform.
- Produce reporting for department leadership on student outcomes.

**Platform Touchpoints**
- Advisor Portal dashboard, client profile management, analytics reporting, messaging/notes module.
- Scheduled exports for leadership meetings.

**Workflow Steps**
1. **Advisor Portal Login & Roster Sync**  
   - *UI Interaction:* Alicia signs in via institutional SSO; roster of assigned students auto-loads.  
   - *Backend Interaction:* Advisor portal authenticates via SSO provider; pulls roster from SIS integration (Features 3.1 Career Advisor Portal, 3.2 Institutional Integration).  
   - *Acceptance Criteria:* Login completes under 3 seconds; roster displays key stats (last login, readiness score) with filters.
2. **Student Profile Review & Note Logging**  
   - *UI Interaction:* Opens individual student profile, reviews skills dashboard, adds advising notes with next steps.  
   - *Backend Interaction:* Notes service timestamps entries; profile API fetches latest assessments and action plan progress (Features 2.3, 5.3, 6.1, 7.1).  
   - *Acceptance Criteria:* Notes save with author/time; dashboard reflects current assessment data and is exportable.
3. **Bulk Task Assignment**  
   - *UI Interaction:* Selects a cohort and assigns “Career Readiness Self-Assessment” to all.  
   - *Backend Interaction:* Task scheduler queues notifications; assessment service clones assignment to each student (Features 3.1 Bulk assessment, 6.3 notifications).  
   - *Acceptance Criteria:* Confirmation displays number of students assigned; each student receives notification within 15 minutes.
4. **Progress Monitoring & Alerts**  
   - *UI Interaction:* Uses analytics dashboard to filter students with readiness score <60%; sets reminder to follow up.  
   - *Backend Interaction:* Analytics engine calculates readiness trend; alerting service schedules follow-up reminders (Features 6.2, 6.3).  
   - *Acceptance Criteria:* Filter results export to CSV; reminders appear in advisor’s task list and trigger email summary.
5. **Reporting & Outcome Sharing**  
   - *UI Interaction:* Generates quarterly report on skill growth and placement outcomes for leadership.  
   - *Backend Interaction:* Reporting engine aggregates data, anonymizes per institutional policy, and exports PDF/CSV (Features 7.1, 7.2, Phase 3 analytics).  
   - *Acceptance Criteria:* Report includes charts and underlying tables; download completes without data truncation.

**Data Requirements**
- SIS roster data, student profiles, assessment results, notes logs, action plan completion metrics.
- Access control metadata tying students to advisors for permissions.
- Reporting filters (date ranges, cohorts, majors) to drive exports.

**Success Criteria**
- Advisor manages caseload within platform without external spreadsheets; completion rates improve through targeted interventions.  
- Leadership receives quarterly reports with demonstrable skill gains and placement outcomes.

**Failure Outcomes**
- Roster sync errors create orphaned students; QA checks system warnings and retry mechanism.  
- Reporting engine must flag if export exceeds row limits; failure to notify is a defect.

---

## Institutional and Partner Use Cases

### Use Case 1: Workforce Development Agency – Bulk Upload and Analytics

**Starting Conditions**
- Agency administrator has secure Partner Portal access and a ZIP archive of 500+ client resumes organized by intake cohort.
- Funding stakeholders expect quarterly analytics on placement outcomes and skill gaps.

**User Goals**
- Automate resume ingestion to reduce manual data entry.  
- Monitor cohort-level skill trends and outcomes for compliance reporting.  
- Enable counselors to manage individual action plans.

**Platform Touchpoints**
- Partner Portal dashboard, bulk upload module, analytics suite, client profile interface, automated survey system.

**Workflow Steps**
1. **Bulk Resume Import**  
   - *UI Interaction:* Admin selects “Bulk Resume Import,” uploads ZIP, and maps cohort metadata.  
   - *Backend Interaction:* File ingestion service validates formats, triggers parallel NLP parsing, and logs status (Features 3.1 Advisor Portal bulk tools, 1.3 resume upload).  
   - *Acceptance Criteria:* System accepts ZIP up to defined size; progress bar updates in real time; failed files listed with retry options.
2. **Automated Profile Generation**  
   - *UI Interaction:* Admin reviews import summary showing number of new vs. duplicate profiles.  
   - *Backend Interaction:* Parsing engine structures skills via O*NET taxonomy; duplicate detection prompts merge workflow (Features 2.3, 4.1).  
   - *Acceptance Criteria:* Each profile tagged with cohort; duplicates flagged for review; summary exports to CSV.
3. **Cohort Analytics Review**  
   - *UI Interaction:* Accesses analytics dashboard with heatmaps for top skills, gaps, and baseline readiness scores.  
   - *Backend Interaction:* Analytics engine aggregates metrics; visualization service renders charts (Features 6.2, Phase 4 analytics).  
   - *Acceptance Criteria:* Dashboards filter by cohort and date; data refresh timestamp visible; exports include visual and raw data.
4. **Individual Client Management**  
   - *UI Interaction:* Counselors drill into profiles, assign action plans, and log interventions.  
   - *Backend Interaction:* Action plan service assigns tasks; notes module records interventions; notification service schedules reminders (Features 5.3, 6.3, 3.1 advisor tooling).  
   - *Acceptance Criteria:* Tasks assigned appear on client dashboard; counselor notes timestamped; reminders sent via email/SMS per configuration.
5. **Outcome Tracking & Reporting**  
   - *UI Interaction:* Admin configures automated outcome surveys and generates quarterly placement reports.  
   - *Backend Interaction:* Survey service sends emails at defined intervals; reporting engine aggregates time-to-employment, wage outcomes, retention metrics (Features 7.1–7.2, Phase 4 analytics).  
   - *Acceptance Criteria:* Surveys log response rates; reports include key metrics (time to employment, wage deltas, retention) with historical comparison.

**Data Requirements**
- Resume files, cohort identifiers, client contact info, counselor assignments.  
- O*NET skill mappings, placement outcomes, wage data, survey responses.

**Success Criteria**
- Intake processing time reduced by ≥75%; analytics dashboards provide up-to-date metrics for funder reporting.  
- Counselors maintain active action plans for ≥90% of clients.

**Failure Outcomes**
- Upload failures without explicit error messaging are defects; QA verifies retry functionality.  
- Missing cohort tags block analytics segmentation; system must prevent completion without metadata.

---

### Use Case 2: College Career Center – Automated Skill Diagnostics and Curriculum Impact

**Starting Conditions**
- Institution has integrated SkillForge API with Student Information System (SIS); invites auto-sent to all enrolled students.  
- Career center aims to correlate curriculum participation with skill growth and employment outcomes.

**User Goals**
- Establish baseline skill diagnostics for every student.  
- Align course offerings with employer demand.  
- Provide advisors and faculty with actionable insights.

**Platform Touchpoints**
- API integration, student onboarding portal, analytics dashboard, curriculum alignment module, reporting exports.

**Workflow Steps**
1. **Student Onboarding Campaign**  
   - *UI Interaction:* Students receive email invite, authenticate via SSO, and complete onboarding/resume upload.  
   - *Backend Interaction:* API provisions accounts; onboarding wizard collects baseline data (Features 1.1–1.3, 2.3).  
   - *Acceptance Criteria:* Completion rates trackable; resumes parsed within minutes; onboarding data synced to SIS ID.
2. **Baseline Skills Diagnostic**  
   - *UI Interaction:* Students review Skills Profile Dashboard with readiness score.  
   - *Backend Interaction:* Assessment engine processes resume + self-assessment responses, generating baseline metrics (Features 2.1–2.3, 6.2).  
   - *Acceptance Criteria:* Dashboard shows categorized skills, readiness score, and gap summary; exports accessible to advisors.
3. **Curriculum Alignment Analysis**  
   - *UI Interaction:* Career center maps courses to skills; reviews impact charts per major.  
   - *Backend Interaction:* Integration ingests course completion data; analytics engine correlates with skill progression (Features 4.2, 5.1, Phase 3 institutional integration).  
   - *Acceptance Criteria:* Course-to-skill mappings editable; dashboard highlights top ROI courses; data updates post-semester.
4. **Career Readiness Interventions**  
   - *UI Interaction:* Students receive personalized recommendations (courses, co-curriculars, internships).  
   - *Backend Interaction:* Recommendation engine filters options; notification service sends nudges (Features 4.3, 5.3, 6.3).  
   - *Acceptance Criteria:* Recommendations include provider, cost, duration; acceptance/decline tracked per student.
5. **Impact Reporting**  
   - *UI Interaction:* Administrators generate accreditation-ready reports summarizing skill growth, employment outcomes, employer feedback.  
   - *Backend Interaction:* Reporting engine aggregates metrics by program/cohort; anonymizes data as needed (Features 7.1–7.2, Phase 4 analytics).  
   - *Acceptance Criteria:* Reports include trendlines and cohort comparisons; exports delivered in PDF/CSV without missing data.

**Data Requirements**
- Student roster, SIS course enrollments, resume/assessment data, internship/job placement records, employer feedback surveys.

**Success Criteria**
- Demonstrable link between specific courses and skill improvements; readiness scores improve year over year.  
- Administrators can produce accreditation evidence within minutes.

**Failure Outcomes**
- If course completion feeds fail, curriculum impact charts display stale data; QA ensures warning banners appear.  
- Missing consent records prevent sharing data with faculty; system must block unauthorized exports.

---

### Use Case 3: Recruiting Agency – Mass Resume Parsing and Candidate-Job Matching

**Starting Conditions**
- Recruiting agency maintains a repository of 1,000+ candidate resumes and receives daily job requisitions from clients.
- Goal is to decrease time-to-fill and improve placement accuracy through structured skills data.

**User Goals**
- Rapidly convert resumes into searchable profiles.  
- Match candidates to job requirements with transparent scoring.  
- Track pipeline stages and placement outcomes for clients.

**Platform Touchpoints**
- Recruiter workspace, candidate/job repositories, matching engine dashboard, pipeline tracking module, analytics reports.

**Workflow Steps**
1. **Candidate Database Population**  
   - *UI Interaction:* Recruiter uploads bulk resume set and monitors parsing queue.  
   - *Backend Interaction:* Ingestion service processes files, builds structured profiles with proficiency estimates (Features 1.3, 2.3).  
   - *Acceptance Criteria:* Parsing success/failure stats displayed; profiles searchable by skill, location, experience.
2. **Job Requisition Intake**  
   - *UI Interaction:* Recruiter uploads job description or pastes JD text; configures required vs. preferred skills.  
   - *Backend Interaction:* Job profile generator extracts skill requirements and weights them (Features 3.3, 4.1).  
   - *Acceptance Criteria:* Job profiles include mandatory/optional skills, salary range, and client metadata; edit confirmation displayed.
3. **Automated Candidate Matching**  
   - *UI Interaction:* Matching dashboard presents ranked candidates with match scores and gap highlights.  
   - *Backend Interaction:* Matching algorithm scores profiles, factoring experience and growth indicators (Features 3.3, 4.1, Phase 2 AI recommendations).  
   - *Acceptance Criteria:* Match results include explanations (skills matched/missing); recruiter can adjust weights and rerun instantly.
4. **Pipeline Tracking**  
   - *UI Interaction:* Recruiter advances candidates through stages (submitted, interview, offer, placement).  
   - *Backend Interaction:* Pipeline service logs stage changes; notification system updates candidates and clients (Features 5.3, 6.3, Phase 3 employer partnership).  
   - *Acceptance Criteria:* Status changes timestamped; automated notifications customizable per client; pipeline export available.
5. **Placement Outcome Analytics**  
   - *UI Interaction:* Agency manager reviews dashboards for time-to-fill, conversion rates, retention stats.  
   - *Backend Interaction:* Analytics engine aggregates per-client/per-role metrics; insights recommend sourcing strategies (Features 6.2, Phase 4 analytics).  
   - *Acceptance Criteria:* Dashboards filter by client/industry; insights highlight bottlenecks; data exportable.

**Data Requirements**
- Candidate resumes, work history, certifications, preferences.  
- Job requisition details, salary ranges, client SLAs.  
- Pipeline timestamps, communication logs, placement outcomes.

**Success Criteria**
- Time-to-fill reduced by ≥35%; placement success rate improves by ≥25%.  
- Candidate experience tracked via automated updates with >90% notification delivery.

**Failure Outcomes**
- Matching scores without traceable rationale fail acceptance; QA ensures explainability fields populated.  
- Pipeline stage changes not reflected in analytics within SLA trigger defect reports.

---

### Benefits for Institutional and Partner Users

- **Scalability:** Handle hundreds or thousands of users with bulk operations and automated workflows.
- **Data Standardization:** Consistent skill taxonomies enable meaningful aggregation and comparison.
- **Outcome Accountability:** Track and report on program effectiveness with objective metrics.
- **Integration Capabilities:** API-first architecture allows seamless connection to existing systems (SIS, ATS, CRM).
- **Competitive Advantage:** Advanced analytics and automation differentiate partners in competitive markets.
