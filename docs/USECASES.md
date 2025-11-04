# SkillForge - Core User Stories and Workflow Walkthroughs
       
- "Data Visualization with Tableau" (Tableau eLearning) - 8 weeks, $150
     
- 
**Medium-Term (6-12 months):**
       
- "Statistics for Data Analysis" (Khan Academy + university course) - 16 weeks, $500
       
- Portfolio project development using real datasets
   
   
- 
**Wage Progression Estimate:**
     
- Current Role: $45,000/year
     
- After Upskilling (Junior Data Analyst): $55,000-$65,000/year
     
- With 2 Years Experience: $70,000-$85,000/year
     
- Senior Data Analyst (5+ years): $90,000-$110,000/year
   
   
- 
**Timeline:**
     
- Skills acquisition: 9-12 months (part-time learning)
     
- Job-ready status: 12-15 months
     
- First analyst role placement: 15-18 months
6. 
**Action Plan:**
   
- James reviews the recommendations and selects "Junior Data Analyst" as his target
   
- Platform generates personalized 12-month roadmap:
     
- Month 1-2: Complete SQL courses and practice queries
     
- Month 3-5: Learn Python basics and data manipulation libraries
     
- Month 6-8: Master data visualization tools and statistics fundamentals
     
- Month 9-10: Build 2-3 portfolio projects demonstrating end-to-end analysis
     
- Month 11-12: Update resume, apply to junior analyst positions, prepare for interviews
   
- Dashboard tracks course completion, skill acquisition milestones, and application activity
   
- James receives weekly reminders and motivational progress updates

**Outcome:**

- James has clear visibility into his career transition requirements
- Automated skill extraction saved 30+ minutes of manual profile entry
- Data-driven recommendations provide realistic timeline and cost expectations
- Personalized learning path maximizes his existing skills while addressing gaps
- Wage projections help James make informed decisions about career investment

### Benefits

- **Time Savings:** Reduces onboarding from 30-45 minutes to 5-10 minutes
- **Accuracy:** NLP parsing minimizes user error and ensures comprehensive skill capture
- **Actionability:** Converts static resume data into dynamic career roadmaps
- **Personalization:** Recommendations tailored to individual background and goals
- **Data-Driven:** Leverages standardized occupational frameworks for credible matching and forecasting

---

## User Personas Walkthrough

### Student Persona

- Seeks practical, affordable career path suited to interests and abilities
- Needs clarity on labor market demand, earning potential, and education requirements
- Relies on platform for trustworthy career data and personalized planning

### Career Changer Persona

- Wants to maximize value of existing skills in a new context
- Needs clear, actionable transition strategy (timeline, costs, steps)
- Seeks career security, growth prospects, and salary improvement

### Career Advisor Persona

- Needs scalable, analytics-powered client management tools
- Relies on evidence-based insights for meaningful guidance
- Provides ongoing support, tracking, and outcome reporting

---

## Institutional and Partner Use Cases

### Use Case 1: Workforce Development Agency - Bulk Upload and Analytics

**User Story:**
As a workforce development agency administrator, I need to upload resumes for hundreds of job seekers in bulk and track their skill profiles and placement outcomes across our programs, so that I can demonstrate program effectiveness to funders and identify systemic skill gaps in our service population.

**Workflow:**

1. **Bulk Upload:**
   - Agency admin logs into SkillForge Partner Portal
   - Selects "Bulk Resume Import" from dashboard
   - Uploads ZIP file containing 500+ client resumes (PDF, DOCX formats)
   - System processes batch upload using parallel NLP parsing
   - Progress indicator shows real-time completion status (estimated 15-20 minutes for 500 resumes)

2. **Automated Profile Creation:**
   - Each resume is parsed and converted into structured skill profile
   - Skills are categorized using O*NET taxonomy
   - Profiles are tagged with agency cohort identifier (e.g., "Q1 2025 Intake")
   - Duplicate detection flags potential re-enrollments

3. **Aggregate Analytics Dashboard:**
   - Admin views cohort-level analytics:
     - Top 20 most common skills across all clients
     - Skill gap heatmap by target occupation
     - Average baseline skill score by industry vertical
     - Education level distribution
   - Export capabilities for reporting to state agencies and grant funders

4. **Individual Client Management:**
   - Agency counselors can drill down to individual client profiles
   - Assign personalized learning paths and track progress
   - Document case notes and intervention activities
   - Monitor job application activity and placement outcomes

5. **Outcome Tracking:**
   - System tracks key metrics:
     - Time to employment (from enrollment to job placement)
     - Starting wage vs. baseline projection
     - Skill acquisition rate (courses completed, certifications earned)
     - Retention rate (90-day, 6-month, 1-year follow-ups)
   - Automated outcome surveys sent to clients at defined intervals
   - Performance dashboards for program evaluation and continuous improvement

**Outcome:**
- Agency reduces intake processing time by 75% (from 45 min/client to 10 min/client)
- Real-time visibility into program performance enables data-driven decision making
- Standardized skill taxonomies facilitate cross-program comparison and benchmarking
- Automated reporting reduces grant compliance burden by 60%

---

### Use Case 2: College or Career Center - Automated Skill Diagnostics and Curriculum Impact

**User Story:**
As a college career services director, I need to automatically assess the skill profiles of our students and track how our curriculum and career development programs impact their workforce readiness, so that I can demonstrate institutional effectiveness and guide curriculum improvements.

**Workflow:**

1. **Student Onboarding:**
   - Career center integrates SkillForge API with student information system
   - All enrolled students receive invitation to create SkillForge profile
   - Students upload resume or CV (or sync LinkedIn profile)
   - Optional: Students complete skills self-assessment survey to supplement resume data

2. **Baseline Skills Diagnostic:**
   - System extracts and analyzes skills from student submissions
   - Generates baseline skill profile showing:
     - Hard skills (technical, software, languages)
     - Soft skills (leadership, communication, teamwork)
     - Academic competencies (research, writing, analytical thinking)
   - Compares student profile to target career paths and identifies gaps
   - Students receive personalized readiness score for their intended career field

3. **Curriculum Alignment Analysis:**
   - Career center maps institutional courses and programs to skill outcomes
   - System tracks which courses students complete (via SIS integration)
   - After each semester, SkillForge re-scans updated resumes or prompts skill updates
   - Platform measures skill acquisition correlated with specific courses and experiences
   - Analytics dashboard shows:
     - Which courses deliver the highest skill development ROI
     - Skill progression by major and graduation cohort
     - Gaps between degree requirements and employer demand

4. **Career Readiness Tracking:**
   - Students receive ongoing feedback on workforce readiness
   - Platform recommends:
     - Relevant elective courses to close skill gaps
     - Co-curricular activities (clubs, competitions, volunteer work)
     - Internship opportunities aligned with career goals
   - Career advisors can proactively intervene with at-risk students

5. **Impact Assessment and Reporting:**
   - Generate institutional reports for accreditation and strategic planning:
     - Average skill growth by degree program
     - Graduate employment rates by skill readiness tier
     - Employer satisfaction correlated with graduate skill profiles
   - Benchmark against peer institutions (anonymized comparative data)
   - Share insights with academic departments to inform curriculum design

**Outcome:**
- College gains data-driven insights into curriculum effectiveness and career outcomes
- Students receive personalized, actionable guidance throughout their academic journey
- Career center demonstrates measurable value to institutional leadership
- Faculty can align course content with real-world skill demands
- Accreditation reports strengthened with objective skills data

---

### Use Case 3: Recruiting Agency - Mass Resume Parsing and Candidate-Job Matching

**User Story:**
As a recruiting agency manager, I need to rapidly parse large volumes of candidate resumes, match them to open job requisitions based on skill alignment, and track placement outcomes, so that I can accelerate time-to-fill, increase placement success rates, and optimize our talent pipeline.

**Workflow:**

1. **Candidate Database Population:**
   - Recruiting agency uploads existing candidate database (1,000+ resumes)
   - System performs bulk NLP parsing and skill extraction
   - Each candidate profile includes:
     - Structured skill inventory with proficiency levels
     - Work history and experience timeline
     - Education credentials and certifications
     - Location and mobility preferences
   - Profiles are searchable and filterable by any skill, keyword, or attribute

2. **Job Requisition Intake:**
   - Recruiter receives new job order from client company
   - Uploads job description to SkillForge
   - System extracts required skills, preferred qualifications, and experience level
   - Creates structured job profile with weighted skill requirements

3. **Automated Candidate Matching:**
   - SkillForge's matching engine scores all candidates against job requirements
   - Algorithm considers:
     - Required skills match (hard requirements)
     - Preferred skills alignment (nice-to-have qualifications)
     - Experience level and industry background
     - Career trajectory and growth indicators
   - Produces ranked candidate list with match scores (0-100%)
   - Highlights skill gaps and development opportunities for near-match candidates

4. **Candidate Submission and Tracking:**
   - Recruiter reviews top-ranked candidates
   - Selects 5-10 candidates to present to client
   - System tracks candidate status through pipeline:
     - Submitted to client
     - Client review
     - Phone screen
     - Interview scheduled
     - Offer extended
     - Placement confirmed
   - Automated email updates keep candidates informed of status

5. **Placement Outcome Analysis:**
   - System tracks key recruiting metrics:
     - Time-to-fill by job type and skill profile
     - Submittal-to-interview conversion rate
     - Interview-to-offer conversion rate
     - Offer acceptance rate
     - Candidate retention at 90 days, 6 months, 1 year
   - Analytics identify:
     - Which skills are hardest to fill
     - Which candidate sources yield best placements
     - Skill combinations that predict placement success
     - Client satisfaction patterns
   - Insights inform talent sourcing strategy and candidate development programs

6. **Continuous Pipeline Optimization:**
   - Platform recommends proactive candidate outreach based on emerging job market trends
   - Identifies high-potential candidates for upskilling in high-demand areas
   - Suggests targeted recruiting campaigns for skill areas with supply gaps
   - Enables data-driven negotiations with clients (e.g., "skill X is 40% harder to find, affecting time-to-fill")

**Outcome:**
- Recruiting agency reduces time-to-fill by 35% through improved candidate matching
- Placement success rate increases by 25% due to better skill alignment
- Candidate experience improves with faster, more relevant job matching
- Data-driven insights enable strategic workforce planning for client companies
- Agency differentiates itself with sophisticated, analytics-powered recruiting capabilities

---

### Benefits for Institutional and Partner Users

- **Scalability:** Handle hundreds or thousands of users with bulk operations and automated workflows
- **Data Standardization:** Consistent skill taxonomies enable meaningful aggregation and comparison
- **Outcome Accountability:** Track and report on program effectiveness with objective metrics
- **Integration Capabilities:** API-first architecture allows seamless connection to existing systems (SIS, ATS, CRM)
- **Competitive Advantage:** Advanced analytics and automation differentiate partners in competitive markets
