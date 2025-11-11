import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertAssessmentTemplates() {
  await prisma.assessmentTemplate.upsert({
    where: { code: 'templ_python_intro' },
    update: {
      name: 'Python Fundamentals',
      description: 'Assess baseline proficiency across control flow, data structures, and debugging.',
      deliveryMode: 'asynchronous'
    },
    create: {
      id: 'templ_python_intro',
      code: 'templ_python_intro',
      name: 'Python Fundamentals',
      description: 'Assess baseline proficiency across control flow, data structures, and debugging.',
      deliveryMode: 'asynchronous'
    }
  });

  await prisma.assessmentTemplate.upsert({
    where: { code: 'templ_sql_basics' },
    update: {
      name: 'SQL Basics',
      description: 'Validates competency across joins, aggregations, and window functions.',
      deliveryMode: 'asynchronous'
    },
    create: {
      id: 'templ_sql_basics',
      code: 'templ_sql_basics',
      name: 'SQL Basics',
      description: 'Validates competency across joins, aggregations, and window functions.',
      deliveryMode: 'asynchronous'
    }
  });
}

async function upsertPersonaUsers() {
  const maya = await prisma.user.upsert({
    where: { email: 'maya.student@skillforge.com' },
    update: {
      firstName: 'Maya',
      lastName: 'Ortiz',
      marketingOptIn: true,
      profile: {
        upsert: {
          update: {
            preferredRoles: ['data_analyst', 'business_intelligence_analyst'],
            goals: ['tenant:orbit-labs', 'goal:complete_python_assessment']
          },
          create: {
            preferredRoles: ['data_analyst', 'business_intelligence_analyst'],
            goals: ['tenant:orbit-labs', 'goal:complete_python_assessment']
          }
        }
      },
      notificationPrefs: {
        upsert: {
          update: {
            channels: { email: true, sms: false },
            quietHours: { start: '21:00', end: '07:00' }
          },
          create: {
            channels: { email: true, sms: false },
            quietHours: { start: '21:00', end: '07:00' }
          }
        }
      }
    },
    create: {
      id: 'user_maya_student',
      email: 'maya.student@skillforge.com',
      firstName: 'Maya',
      lastName: 'Ortiz',
      marketingOptIn: true,
      profile: {
        create: {
          preferredRoles: ['data_analyst', 'business_intelligence_analyst'],
          goals: ['tenant:orbit-labs', 'goal:complete_python_assessment']
        }
      },
      notificationPrefs: {
        create: {
          channels: { email: true, sms: false },
          quietHours: { start: '21:00', end: '07:00' }
        }
      },
      notifications: {
        create: [
          {
            id: 'notif_maya_assessment_due',
            category: 'assessment',
            message: 'Your Python assessment is scheduled for this week.',
            channel: 'email',
            status: 'delivered',
            deliveredAt: new Date()
          }
        ]
      }
    }
  });

  await prisma.resumeIngestion.upsert({
    where: { id: 'resume_ingestion_maya' },
    update: {
      userId: maya.id,
      state: 'processed',
      source: 'upload',
      language: 'en',
      ingestionMetadata: {
        tenantId: 'orbit-labs',
        partnerId: 'development-partner-1'
      }
    },
    create: {
      id: 'resume_ingestion_maya',
      userId: maya.id,
      state: 'processed',
      source: 'upload',
      language: 'en',
      ingestionMetadata: {
        tenantId: 'orbit-labs',
        partnerId: 'development-partner-1'
      }
    }
  });

  await prisma.assessment.upsert({
    where: { id: 'assessment_maya_python' },
    update: {
      userId: maya.id,
      templateId: 'templ_python_intro',
      status: 'completed',
      score: 82,
      notifyUser: true
    },
    create: {
      id: 'assessment_maya_python',
      userId: maya.id,
      templateId: 'templ_python_intro',
      status: 'completed',
      score: 82,
      notifyUser: true,
      responses: { sections: [{ id: 'loops', score: 18 }] }
    }
  });
}

async function upsertReferenceData() {
  const occupation = await prisma.occupation.upsert({
    where: { onetCode: '15-1256.00' },
    update: {
      title: 'Data Scientist',
      description: 'Develops predictive models and data products to guide business decisions.',
      alternativeTitles: ['Machine Learning Specialist'],
      tasks: ['Design experiments', 'Deploy models'],
      workContext: { remoteFriendly: true },
      medianWage: 132500.0,
      wage10thPercentile: 85000.0,
      wage90thPercentile: 185000.0,
      annualOpenings: 48000,
      jobOutlookPercent: 22.5,
      educationLevel: 'bachelors',
      typicalEntryEducation: 'Bachelor\'s degree',
      workExperience: '3+ years applied analytics'
    },
    create: {
      id: 'occupation_data_scientist',
      onetCode: '15-1256.00',
      socCode: '15-1256',
      title: 'Data Scientist',
      description: 'Develops predictive models and data products to guide business decisions.',
      alternativeTitles: ['Machine Learning Specialist'],
      tasks: ['Design experiments', 'Deploy models'],
      workContext: { remoteFriendly: true },
      medianWage: 132500.0,
      wage10thPercentile: 85000.0,
      wage90thPercentile: 185000.0,
      annualOpenings: 48000,
      jobOutlookPercent: 22.5,
      educationLevel: 'bachelors',
      typicalEntryEducation: 'Bachelor\'s degree',
      workExperience: '3+ years applied analytics'
    }
  });

  const skill = await prisma.skill.upsert({
    where: { code: 'SKILL-PYTHON' },
    update: {
      name: 'Python Programming',
      description: 'Ability to design, test, and maintain Python applications.',
      category: 'technical',
      difficulty: 3,
      relatedSkills: ['SKILL-SQL']
    },
    create: {
      id: 'skill_python_programming',
      code: 'SKILL-PYTHON',
      name: 'Python Programming',
      description: 'Ability to design, test, and maintain Python applications.',
      category: 'technical',
      difficulty: 3,
      relatedSkills: ['SKILL-SQL']
    }
  });

  await prisma.occupationSkill.upsert({
    where: {
      occupationId_skillId: {
        occupationId: occupation.id,
        skillId: skill.id
      }
    },
    update: {
      importanceLevel: 85,
      proficiencyLevel: 80
    },
    create: {
      occupationId: occupation.id,
      skillId: skill.id,
      importanceLevel: 85,
      proficiencyLevel: 80
    }
  });
}

async function upsertPartnerRecords() {
  await prisma.partnerCandidateBatch.upsert({
    where: { id: 'batch_partner_demo' },
    update: {
      partnerId: 'development-partner-1',
      environment: 'production',
      webhookUrl: 'https://partners.skillforge.example/webhooks/import',
      processed: 1,
      failed: 0
    },
    create: {
      id: 'batch_partner_demo',
      partnerId: 'development-partner-1',
      environment: 'production',
      webhookUrl: 'https://partners.skillforge.example/webhooks/import',
      processed: 1,
      failed: 0,
      results: {
        create: [
          {
            id: 'batch_partner_demo_result',
            externalId: 'cand-demo-1',
            status: 'processed',
            candidateId: 'sf_candidate_demo',
            jaatVectorVersion: new Date().toISOString()
          }
        ]
      }
    }
  });

  await prisma.partnerAssessment.upsert({
    where: { id: 'partner_assessment_demo' },
    update: {
      partnerId: 'development-partner-1',
      environment: 'production',
      candidateId: 'sf_candidate_demo',
      templateId: 'templ_python_intro',
      deliveryMode: 'asynchronous'
    },
    create: {
      id: 'partner_assessment_demo',
      partnerId: 'development-partner-1',
      environment: 'production',
      candidateId: 'sf_candidate_demo',
      templateId: 'templ_python_intro',
      deliveryMode: 'asynchronous'
    }
  });

  await prisma.partnerBatchAssessment.upsert({
    where: { id: 'partner_batch_assessment_demo' },
    update: {
      partnerId: 'development-partner-1',
      environment: 'production',
      cohortId: 'spring-analytics',
      templateId: 'templ_python_intro',
      candidateIds: ['sf_candidate_demo'],
      queued: 1
    },
    create: {
      id: 'partner_batch_assessment_demo',
      partnerId: 'development-partner-1',
      environment: 'production',
      cohortId: 'spring-analytics',
      templateId: 'templ_python_intro',
      candidateIds: ['sf_candidate_demo'],
      queued: 1
    }
  });

  await prisma.partnerPlacement.upsert({
    where: { id: 'partner_placement_demo' },
    update: {
      partnerId: 'development-partner-1',
      environment: 'production',
      candidateId: 'sf_candidate_demo',
      jobId: 'job-data-analyst-1',
      employerName: 'Orbit Labs',
      placementDate: '2025-05-01',
      employmentType: 'full_time'
    },
    create: {
      id: 'partner_placement_demo',
      partnerId: 'development-partner-1',
      environment: 'production',
      candidateId: 'sf_candidate_demo',
      jobId: 'job-data-analyst-1',
      employerName: 'Orbit Labs',
      placementDate: '2025-05-01',
      employmentType: 'full_time'
    }
  });
}

async function main() {
  await upsertAssessmentTemplates();
  await upsertPersonaUsers();
  await upsertReferenceData();
  await upsertPartnerRecords();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Failed to seed Prisma database', error);
    await prisma.$disconnect();
    process.exit(1);
  });
