import { registerUser } from '../../app/actions/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runRegression() {
  const testEmail = `regression.signup.${Date.now()}@example.com`;
  
  // Create a dummy file buffer with valid PDF magic bytes
  const dummyFile = new File(['%PDF-1.4\n%âãÏÓ\ndummy content'], 'id-proof.pdf', { type: 'application/pdf' });
  
  const formData = new FormData();
  formData.append('firstName', 'Integration');
  formData.append('lastName', 'Test');
  formData.append('email', testEmail);
  formData.append('password', 'StrongPass123!');
  formData.append('mobileNumber', '1234567890');
  formData.append('dateOfBirth', '1950-01-01');
  formData.append('serviceAddress', '123 Test St');
  formData.append('emergencyContactName', 'Emergency Contact');
  formData.append('emergencyContactRelationship', 'Friend');
  formData.append('emergencyContactMobile', '0987654321');
  formData.append('sponsorName', 'Sponsor Name');
  formData.append('sponsorRelationship', 'Son');
  formData.append('sponsorMobile', '1122334455');
  formData.append('idProofFile', dummyFile);
  formData.append('idProofType', 'Passport');
  formData.append('idProofNumber', 'PASS1234');
  formData.append('gender', 'Male');

  console.log("Running registerUser...");
  const result = await registerUser(formData);

  if (!result.success) {
    console.error("Signup Failed:", result.error);
    process.exit(1);
  }

  // Verify database state
  const user = await prisma.user.findUnique({
    where: { email: testEmail },
    include: {
      memberProfile: {
        include: {
          idProofDocument: true
        }
      },
      ownedDocuments: true
    }
  });

  if (!user) {
    console.error("User not found in DB");
    process.exit(1);
  }

  if (!user.memberProfile) {
    console.error("MemberProfile not found in DB");
    process.exit(1);
  }

  if (!user.ownedDocuments || user.ownedDocuments.length === 0) {
    console.error("MemberDocument not found in DB");
    process.exit(1);
  }

  const doc = user.ownedDocuments.find(d => d.id === user.memberProfile?.idProofDocumentId);
  
  if (!doc) {
    console.error("Document reference in MemberProfile is invalid");
    process.exit(1);
  }

  if (doc.userId !== user.id) {
    console.error("Document userId does not match User id");
    process.exit(1);
  }

  console.log("Regression Test Passed! User, Profile, and Document created atomically and properly linked.");
}

runRegression()
  .catch(e => {
    console.error("Test failed with exception:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
