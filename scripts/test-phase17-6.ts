import { PrismaClient } from '@prisma/client';
import { CmsService } from '../lib/services/cms';
import { db } from '../lib/db';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Phase 17.6 Public Integration Tests ---');

  // Test 1: Published FAQ appears publicly
  console.log('\n--- 1. FAQ Public Retrieval ---');
  let faqPub: any, faqDraft: any, faqArchived: any;
  try {
    faqPub = await prisma.faqEntry.create({
      data: { question: 'Pub FAQ?', answer: 'Yes', status: 'PUBLISHED' }
    });
    faqDraft = await prisma.faqEntry.create({
      data: { question: 'Draft FAQ?', answer: 'No', status: 'DRAFT' }
    });
    faqArchived = await prisma.faqEntry.create({
      data: { question: 'Archived FAQ?', answer: 'No', status: 'ARCHIVED' }
    });

    const publicFaqs = await CmsService.getFaqs();
    
    if (publicFaqs.find(f => f.id === faqPub.id) && 
        !publicFaqs.find(f => f.id === faqDraft.id) &&
        !publicFaqs.find(f => f.id === faqArchived.id)) {
      console.log('PASS: Only Published FAQs appear publicly.');
    } else {
      console.error('FAIL: FAQ retrieval logic is incorrect.');
    }
  } finally {
    if (faqPub) await prisma.faqEntry.delete({ where: { id: faqPub.id }});
    if (faqDraft) await prisma.faqEntry.delete({ where: { id: faqDraft.id }});
    if (faqArchived) await prisma.faqEntry.delete({ where: { id: faqArchived.id }});
  }

  // Test 2: Testimonial Public Retrieval
  console.log('\n--- 2. Testimonial Public Retrieval ---');
  let testPub: any, testDraft: any;
  try {
    testPub = await prisma.testimonial.create({
      data: { authorName: 'Pub', quote: 'Pub quote', status: 'PUBLISHED' }
    });
    testDraft = await prisma.testimonial.create({
      data: { authorName: 'Draft', quote: 'Draft quote', status: 'DRAFT' }
    });

    const publicTestimonials = await CmsService.getTestimonials();

    if (publicTestimonials.find(t => t.id === testPub.id) &&
        !publicTestimonials.find(t => t.id === testDraft.id)) {
      console.log('PASS: Only Published Testimonials appear publicly.');
    } else {
      console.error('FAIL: Testimonial retrieval logic is incorrect.');
    }
  } finally {
    if (testPub) await prisma.testimonial.delete({ where: { id: testPub.id }});
    if (testDraft) await prisma.testimonial.delete({ where: { id: testDraft.id }});
  }

  // Test 3: Public Employee Privacy Check
  const fs2 = require('fs');
  const path = require('path');
  if(!fs2.existsSync(path.join(process.cwd(), 'app', 'api', 'employees'))) { console.log('PASS: No public employee API route exists.'); } else { console.error('FAIL: Public employee API route found!'); }
}
runTests().catch(console.error).finally(() => prisma.$disconnect());
