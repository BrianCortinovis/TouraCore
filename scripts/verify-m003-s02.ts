import { encrypt, decrypt } from '../packages/core/security/src/encryption'

let pass = 0
let fail = 0

function ok(label: string) { console.log(`  ✓ ${label}`); pass++ }
function ko(label: string) { console.log(`  ✗ ${label}`); fail++ }

console.log('=== M003/S02 Verification ===')
console.log('')

// --- 1. Encryption roundtrip ---
console.log('1. Encryption Roundtrip')
try {
  const plaintext = 'sk_live_secret_stripe_key_123'
  const ciphertext = encrypt(plaintext)

  if (ciphertext !== plaintext) {
    ok('Ciphertext differs from plaintext')
  } else {
    ko('Ciphertext is same as plaintext')
  }

  const decrypted = decrypt(ciphertext)
  if (decrypted === plaintext) {
    ok('Decrypt(Encrypt(text)) === text')
  } else {
    ko(`Roundtrip failed: got "${decrypted}"`)
  }
} catch (e) {
  ko(`Encryption error: ${e instanceof Error ? e.message : String(e)}`)
}

// --- 2. Different ciphertexts for same plaintext (IV randomness) ---
console.log('')
console.log('2. IV Randomness')
try {
  const text = 'test123'
  const c1 = encrypt(text)
  const c2 = encrypt(text)

  if (c1 !== c2) {
    ok('Two encryptions of same text produce different ciphertexts')
  } else {
    ko('Two encryptions produced identical ciphertext — IV not random')
  }
} catch (e) {
  ko(`IV test error: ${e instanceof Error ? e.message : String(e)}`)
}

// --- 3. Tamper detection ---
console.log('')
console.log('3. Tamper Detection')
try {
  const ciphertext = encrypt('sensitive data')
  const tampered = ciphertext.slice(0, -2) + 'XX'
  try {
    decrypt(tampered)
    ko('Tampered ciphertext decrypted without error')
  } catch {
    ok('Tampered ciphertext correctly rejected')
  }
} catch (e) {
  ko(`Tamper test error: ${e instanceof Error ? e.message : String(e)}`)
}

// --- 4. Unicode support ---
console.log('')
console.log('4. Unicode Support')
try {
  const unicode = 'Configurazione: àèìòù 日本語 🔑'
  const decrypted = decrypt(encrypt(unicode))
  if (decrypted === unicode) {
    ok('Unicode roundtrip successful')
  } else {
    ko('Unicode roundtrip failed')
  }
} catch (e) {
  ko(`Unicode test error: ${e instanceof Error ? e.message : String(e)}`)
}

console.log('')
console.log(`=== Results: ${pass} passed, ${fail} failed ===`)

if (fail > 0) process.exit(1)
