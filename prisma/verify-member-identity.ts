import { db } from '../lib/db'
import { MemberIdentityService } from '../lib/services/member-identity'
import { registerUser } from '../app/actions/auth'
import { ROLES } from '../lib/auth/roles'

async function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function verifyMemberIdentity() {
  console.log('Starting Phase 12 Member Identity Verification...')

  // Clean up
  const usersToClean = await db.user.findMany({
    where: {
      email: {
        in: [
          'test-member1@example.com',
          'test-member2@example.com',
          'dup-member@example.com',
        ]
      }
    }
  })

  const userIdsToClean = usersToClean.map(u => u.id)

  if (userIdsToClean.length > 0) {
    await db.auditLog.deleteMany({
      where: { actorUserId: { in: userIdsToClean } }
    })
    await db.user.deleteMany({
      where: { id: { in: userIdsToClean } }
    })
  }

  // D. Member ID foundation
  console.log('Testing Member ID generation foundation...')
  const id1 = await MemberIdentityService.generateMemberId('Sagnik', 'Kar', 'S')
  const id2 = await MemberIdentityService.generateMemberId('John', 'Doe', 'D')
  
  // Test initials and S/D format
  assert(id1.startsWith('SEC/S/'), 'S format preserved')
  assert(id1.endsWith('/SAKA'), 'Initials generated server-side (SAKA)')
  assert(id2.startsWith('SEC/D/'), 'D format preserved')
  assert(id2.endsWith('/JODO'), 'Initials generated server-side (JODO)')
  
  // Ensure IDs are unique and increment
  const seq1 = parseInt(id1.split('/')[2])
  const seq2 = parseInt(id2.split('/')[2])
  assert(seq2 > seq1, 'Sequence increments safely')
  
  // A. Registration
  console.log('Testing Registration workflows...')
  
  // Create mock FormData
  const formData = new FormData()
  formData.append('firstName', 'Test')
  formData.append('lastName', 'Member')
  formData.append('email', 'test-member1@example.com')
  formData.append('password', 'password123')
  formData.append('dateOfBirth', '1950-01-01')
  formData.append('gender', 'Male')
  formData.append('serviceAddress', '123 Care St')
  formData.append('mobileNumber', '9876543210')
  formData.append('emergencyContactName', 'EC Name')
  formData.append('emergencyContactRelationship', 'Son')
  formData.append('emergencyContactMobile', '1234567890')
  formData.append('sponsorName', 'Sponsor Name')
  formData.append('sponsorRelationship', 'Son')
  formData.append('sponsorMobile', '1234567890')
  formData.append('idProofNumber', 'SECRET-PROOF-123')
  
  const result = await registerUser(formData)
  assert(result.success === true, 'Valid registration succeeds')

  const user = await db.user.findUnique({
    where: { email: 'test-member1@example.com' },
    include: { memberProfile: true }
  })

  assert(user !== null, 'User created in DB')
  assert(user?.passwordHash !== 'password123' && user?.passwordHash !== null, 'Password is never stored plaintext')
  assert(user?.memberProfile !== null, 'Member Profile created')
  assert(user?.memberProfile?.memberId === null, 'Member ID is NULL before confirmation')

  // Duplicate email check
  console.log('Testing Duplicate email handling...')
  const dupResult = await registerUser(formData)
  assert(dupResult.success === false, 'Duplicate email rejected safely')
  assert(dupResult.error?.includes('email may already be in use') || false, 'Safe error message for duplicate email')

  // Invalid input
  const invalidData = new FormData()
  invalidData.append('email', 'invalid')
  invalidData.append('password', 'short')
  const invalidResult = await registerUser(invalidData)
  assert(invalidResult.success === false, 'Invalid input rejected')

  // C. Sensitive data & Audit
  console.log('Testing Sensitive Data and Audit Logging...')
  const auditLogs = await db.auditLog.findMany({
    where: { actorUserId: user?.id, action: 'MEMBER_REGISTERED' }
  })
  
  assert(auditLogs.length > 0, 'Audit log created for registration')
  const logStr = JSON.stringify(auditLogs[0])
  assert(!logStr.includes('SECRET-PROOF-123'), 'Sensitive values do not appear in audit metadata')

  // Sponsor vs Emergency Contact
  console.log('Testing Sponsor vs Emergency Contact separation...')
  const sponsor = await db.sponsor.findUnique({ where: { memberProfileId: user!.memberProfile!.id } })
  const emergencyContact = await db.emergencyContact.findUnique({ where: { userId: user!.id } })
  assert(sponsor !== null, 'Sponsor created independently')
  assert(emergencyContact !== null, 'Emergency Contact created independently')
  assert(sponsor!.id !== emergencyContact!.id, 'Sponsor and Emergency Contact are separate records')

  console.log('✅ All Phase 12 Member Identity Tests Passed!')
}

verifyMemberIdentity().catch(e => {
  console.error('❌ Verification failed:', e)
  process.exit(1)
}).finally(() => db.$disconnect())
