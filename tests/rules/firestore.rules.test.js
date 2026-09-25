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

const validQuote = {
  type: 'auto', name: 'Test Client', phone: '5745551234', email: '', zip: '46580',
  service: 'detailing', vehicle: '2020 Ford F-150', message: '', lang: 'en',
  status: 'new', createdAt: Date.now(), userAgent: 'vitest',
}

describe('quotes collection', () => {
  it('lets an anonymous visitor create a valid quote request', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(addDoc(collection(db, 'quotes'), validQuote))
  })

  it('rejects a quote missing required fields', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    const { name, ...incomplete } = validQuote
    await assertFails(addDoc(collection(db, 'quotes'), incomplete))
  })

  it('rejects a quote with status other than "new" from an anonymous visitor', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(addDoc(collection(db, 'quotes'), { ...validQuote, status: 'accepted' }))
  })

  it('blocks anonymous read/update/delete of quotes', async () => {
    const adminDb = testEnv.authenticatedContext('staff-1').firestore()
    const ref = await addDoc(collection(adminDb, 'quotes'), validQuote)

    const anonDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anonDb, 'quotes', ref.id)))
    await assertFails(updateDoc(doc(anonDb, 'quotes', ref.id), { status: 'contacted' }))
    await assertFails(deleteDoc(doc(anonDb, 'quotes', ref.id)))
  })

  it('lets signed-in staff read, update and delete quotes', async () => {
    const staffDb = testEnv.authenticatedContext('staff-1').firestore()
    const ref = await addDoc(collection(staffDb, 'quotes'), validQuote)
    await assertSucceeds(getDoc(doc(staffDb, 'quotes', ref.id)))
    await assertSucceeds(updateDoc(doc(staffDb, 'quotes', ref.id), { status: 'contacted' }))
    await assertSucceeds(deleteDoc(doc(staffDb, 'quotes', ref.id)))
  })
})

describe('feedback collection', () => {
  const validFeedback = { text: 'Please add a dark mode toggle.', status: 'pending', createdAt: Date.now() }

  it('lets anyone submit feedback', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(addDoc(collection(db, 'feedback'), validFeedback))
  })

  it('blocks anonymous read and delete of feedback (previously world-readable/deletable)', async () => {
    const staffDb = testEnv.authenticatedContext('staff-1').firestore()
    const ref = await addDoc(collection(staffDb, 'feedback'), validFeedback)

    const anonDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anonDb, 'feedback', ref.id)))
    await assertFails(deleteDoc(doc(anonDb, 'feedback', ref.id)))
    await assertFails(getDocs(collection(anonDb, 'feedback')))
  })

  it('lets signed-in staff read and mark feedback done, but not edit its text', async () => {
    const staffDb = testEnv.authenticatedContext('staff-1').firestore()
    const ref = await addDoc(collection(staffDb, 'feedback'), validFeedback)
    await assertSucceeds(getDoc(doc(staffDb, 'feedback', ref.id)))
    await assertSucceeds(updateDoc(doc(staffDb, 'feedback', ref.id), { status: 'done' }))
    await assertFails(updateDoc(doc(staffDb, 'feedback', ref.id), { text: 'edited' }))
  })
})

describe('internal-only collections (clients, jobs, finance, plans)', () => {
  it('blocks anonymous access entirely', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(addDoc(collection(db, 'clients'), { name: 'x' }))
    await assertFails(getDocs(collection(db, 'jobs')))
    await assertFails(getDocs(collection(db, 'finance')))
    await assertFails(getDocs(collection(db, 'plans')))
  })

  it('lets signed-in staff read and write', async () => {
    const db = testEnv.authenticatedContext('staff-1').firestore()
    await assertSucceeds(setDoc(doc(db, 'clients', 'c1'), { name: 'Jane Doe' }))
    await assertSucceeds(getDoc(doc(db, 'clients', 'c1')))
  })
})
