import { JwtPayload, decode, verify } from "jsonwebtoken";
import jwks from 'jwks-rsa'
import { z } from "zod";

export type TokenValidationOptions = {
  client_id: string
  tenant_id: string
};

export async function validate(token: string, options: TokenValidationOptions) {
  // 0. We need to get and compare:
  // - kid (key id)
  const decoded_token = decode(token, { json: true, complete: true });
  const kid = decoded_token?.header.kid;
  if (!kid) throw 'kid not provided';

  // 1. Get oidc configuration
  const { jwks_uri, issuer } = await get_oidc(options);

  // 2. Get signing key
  const signing_key = await get_signing_key(jwks_uri, kid);

  // 3. Verify JWT
  verify(token, signing_key, {
    audience: options.client_id,
    issuer: issuer,
    algorithms: ['RS256']
  });
  const payload = verify(token, signing_key) as JwtPayload;

  console.log('payload', payload);
}

const oidc_schema = z.object({
  jwks_uri: z.string(),
  issuer: z.string(),
  id_token_signing_alg_values_supported: z.string().array()
});

async function get_oidc({ tenant_id }: TokenValidationOptions) {
  const oidc_uri = `https://login.microsoftonline.com/${tenant_id}/.well-known/openid-configuration`;
  const response = await fetch(oidc_uri);
  if (!response.ok) throw `got status code: ${response.status}, ${response.statusText}`;

  const body = await response.json();
  const parsed = await oidc_schema.safeParseAsync(body);
  if (!parsed.success) {
    console.log('could not parse oidc body: ', body);
    console.log('error: ', parsed.error);
    throw '';
  }

  return parsed.data;
}

async function get_signing_key(uri: string, kid: string) {
  const client = jwks({ jwksUri: uri });
  const key = await client.getSigningKey(kid);
  const signing_key = key.getPublicKey();
  return signing_key;
}
