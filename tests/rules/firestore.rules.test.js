import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { setDoc, doc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs } from 'firebase/firestore'

// Runs against the local Firestore emulator — never touches the real
// gutierrez-generalservices project. Start it with:
//   firebase emulators:exec --only firestore "vitest run tests/rules"
// (see package.json's `test:rules` script, which does exactly this).

let testEnv

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'gutierrez-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

// Staff = a signed-in account that also carries the "admin" custom claim.
// A signed-in account WITHOUT that claim must be treated the same as anonymous
// for every internal collection — that's the whole point of this claim.
const staffDb = () => testEnv.authenticatedContext('staff-1', { admin: true }).firestore()
const otherUserDb = () => testEnv.authenticatedContext('random-user', {}).firestore()
const anonDb = () => testEnv.unauthenticatedContext().firestore()

const validQuote = {
  type: 'auto', name: 'Test Client', phone: '5745551234', email: '', zip: '46580',
  service: 'detailing', vehicle: '2020 Ford F-150', message: '', lang: 'en',
  status: 'new', createdAt: Date.now(), userAgent: 'vitest',
}

describe('quotes collection', () => {
  it('lets an anonymous visitor create a valid quote request', async () => {
    await assertSucceeds(addDoc(collection(anonDb(), 'quotes'), validQuote))
  })

  it('rejects a quote missing required fields', async () => {
    const { name, ...incomplete } = validQuote
    await assertFails(addDoc(collection(anonDb(), 'quotes'), incomplete))
  })

  it('rejects a quote with status other than "new" from an anonymous visitor', async () => {
    await assertFails(addDoc(collection(anonDb(), 'quotes'), { ...validQuote, status: 'accepted' }))
  })

  it('blocks anonymous read/update/delete of quotes', async () => {
    const ref = await addDoc(collection(staffDb(), 'quotes'), validQuote)

    await assertFails(getDoc(doc(anonDb(), 'quotes', ref.id)))
    await assertFails(updateDoc(doc(anonDb(), 'quotes', ref.id), { status: 'contacted' }))
    await assertFails(deleteDoc(doc(anonDb(), 'quotes', ref.id)))
  })

  it('blocks a signed-in account without the admin claim from reading/updating/deleting quotes', async () => {
    const ref = await addDoc(collection(staffDb(), 'quotes'), validQuote)

    await assertFails(getDoc(doc(otherUserDb(), 'quotes', ref.id)))
    await assertFails(updateDoc(doc(otherUserDb(), 'quotes', ref.id), { status: 'contacted' }))
    await assertFails(deleteDoc(doc(otherUserDb(), 'quotes', ref.id)))
  })

  it('lets staff (admin claim) read, update and delete quotes', async () => {
    const ref = await addDoc(collection(staffDb(), 'quotes'), validQuote)
    await assertSucceeds(getDoc(doc(staffDb(), 'quotes', ref.id)))
    await assertSucceeds(updateDoc(doc(staffDb(), 'quotes', ref.id), { status: 'contacted' }))
    await assertSucceeds(deleteDoc(doc(staffDb(), 'quotes', ref.id)))
  })
})

describe('feedback collection', () => {
  const validFeedback = { text: 'Please add a dark mode toggle.', status: 'pending', createdAt: Date.now() }

  it('lets anyone submit feedback', async () => {
    await assertSucceeds(addDoc(collection(anonDb(), 'feedback'), validFeedback))
  })

  it('blocks anonymous read and delete of feedback (previously world-readable/deletable)', async () => {
    const ref = await addDoc(collection(staffDb(), 'feedback'), validFeedback)

    await assertFails(getDoc(doc(anonDb(), 'feedback', ref.id)))
    await assertFails(deleteDoc(doc(anonDb(), 'feedback', ref.id)))
    await assertFails(getDocs(collection(anonDb(), 'feedback')))
  })

  it('blocks a signed-in account without the admin claim from reading feedback', async () => {
    const ref = await addDoc(collection(staffDb(), 'feedback'), validFeedback)
    await assertFails(getDoc(doc(otherUserDb(), 'feedback', ref.id)))
    await assertFails(updateDoc(doc(otherUserDb(), 'feedback', ref.id), { status: 'done' }))
  })

  it('lets staff read and mark feedback done, but not edit its text', async () => {
    const ref = await addDoc(collection(staffDb(), 'feedback'), validFeedback)
    await assertSucceeds(getDoc(doc(staffDb(), 'feedback', ref.id)))
    await assertSucceeds(updateDoc(doc(staffDb(), 'feedback', ref.id), { status: 'done' }))
    await assertFails(updateDoc(doc(staffDb(), 'feedback', ref.id), { text: 'edited' }))
  })
})

describe('internal-only collections (clients, jobs, finance, plans)', () => {
  it('blocks anonymous access entirely', async () => {
    await assertFails(addDoc(collection(anonDb(), 'clients'), { name: 'x' }))
    await assertFails(getDocs(collection(anonDb(), 'jobs')))
    await assertFails(getDocs(collection(anonDb(), 'finance')))
    await assertFails(getDocs(collection(anonDb(), 'plans')))
  })

  it('blocks a signed-in account without the admin claim (this is the fix for the "any account = full CRM access" gap)', async () => {
    await assertFails(addDoc(collection(otherUserDb(), 'clients'), { name: 'x' }))
    await assertFails(getDocs(collection(otherUserDb(), 'jobs')))
    await assertFails(getDocs(collection(otherUserDb(), 'finance')))
    await assertFails(getDocs(collection(otherUserDb(), 'plans')))
  })

  it('lets staff (admin claim) read and write', async () => {
    await assertSucceeds(setDoc(doc(staffDb(), 'clients', 'c1'), { name: 'Jane Doe' }))
    await assertSucceeds(getDoc(doc(staffDb(), 'clients', 'c1')))
  })
})
