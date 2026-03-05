import mongoose from 'mongoose';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ACCOUNT_ENCRYPTION_KEY || 'dev-key-1234567890abcdef1234567890abcd';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(enc) {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const [ivHex, data] = enc.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const schema = new mongoose.Schema(
  {
    provider: { type: String, required: true, unique: true },
    clientIdEncrypted: { type: String, required: true },
    clientSecretEncrypted: { type: String, required: true },
    redirectUri: { type: String },
  },
  { timestamps: true }
);

schema.methods.getClientId = function () {
  return decrypt(this.clientIdEncrypted);
};

schema.methods.getClientSecret = function () {
  return decrypt(this.clientSecretEncrypted);
};

schema.statics.saveEncrypted = async function (provider, clientId, clientSecret, redirectUri) {
  const payload = {
    provider,
    clientIdEncrypted: encrypt(clientId),
    clientSecretEncrypted: encrypt(clientSecret),
    redirectUri: redirectUri || undefined,
  };
  const existing = await this.findOne({ provider });
  if (existing) {
    existing.clientIdEncrypted = payload.clientIdEncrypted;
    existing.clientSecretEncrypted = payload.clientSecretEncrypted;
    existing.redirectUri = payload.redirectUri;
    await existing.save();
    return existing;
  }
  return await this.create(payload);
};

export default mongoose.model('OAuthCredentials', schema);
