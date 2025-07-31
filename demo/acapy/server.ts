import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import all_routes_v2 from './routes/v2/agent.all.routes';
import BaseAgentV1 from './controllers/v1/agent.base';
import BaseAgentV2 from './controllers/v2/agent.base';

dotenv.config();

interface SchemaInfo {
  schema_id: string;
  schema_name: string;
  schema_version: string;
  attributes: string[];
}

interface ExtendedBaseAgent {
  credentialDefinitionId: string;
  sharedSchemaInfo?: SchemaInfo;
}

const agentType = process.argv[2];
const port =
  agentType === '--issuer'
    ? parseInt(process.env.ISSUER_API_PORT || '4000')
    : parseInt(process.env.VERIFIER_API_PORT || '4002');

const agentPort = agentType === '--issuer' ? '8021' : '8031';

const app = express();
app.use(express.json());
app.use(cors());

const SHARED_SCHEMA_FILE = path.join(__dirname, 'shared-schema-info.json');

function saveSchemaInfo(schemaInfo: SchemaInfo) {
  try {
    fs.writeFileSync(SHARED_SCHEMA_FILE, JSON.stringify(schemaInfo, null, 2), 'utf8');
    console.log(`Saved schema info: ${schemaInfo.schema_id}`);
  } catch (error) {
    console.error('Error saving schema info:', error);
  }
}

function loadSchemaInfo(): SchemaInfo | null {
  try {
    if (fs.existsSync(SHARED_SCHEMA_FILE)) {
      const schemaInfo = JSON.parse(fs.readFileSync(SHARED_SCHEMA_FILE, 'utf8'));
      console.log(`Loaded schema info: ${schemaInfo.schema_id}`);
      return schemaInfo;
    }
  } catch (error) {
    console.error('Error loading schema info:', error);
  }
  return null;
}

async function getExistingSchemas(): Promise<string[]> {
  try {
    const res = await fetch(`http://localhost:${agentPort}/schemas/created`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.schema_ids || [];
  } catch (e) {
    console.error('Error fetching existing schemas:', e);
    return [];
  }
}

async function createOrGetSchema(): Promise<SchemaInfo | null> {
  try {
    const existingSchemas = await getExistingSchemas();
    const requiredAttrs = ['username', 'email', 'occupation', 'citizenship'];
    for (const schemaId of existingSchemas) {
      try {
        const res = await fetch(`http://localhost:${agentPort}/schemas/${schemaId}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) continue;
        const data = await res.json();
        const attrs = data.schema?.attrNames || [];
        if (requiredAttrs.every(a => attrs.includes(a))) {
          console.log(`Found existing schema: ${schemaId}`);
          return {
            schema_id: schemaId,
            schema_name: data.schema?.name || 'University-Certificate',
            schema_version: data.schema?.version || '1.0',
            attributes: attrs,
          };
        }
      } catch (e) {
        console.error(`Error loading schema ${schemaId}:`, e);
      }
    }

    const timestamp = Date.now();
    const schemaPayload = {
      schema_name: 'University-Certificate',
      schema_version: `1.0.${timestamp}`,
      attributes: requiredAttrs,
    };

    const res = await fetch(`http://localhost:${agentPort}/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schemaPayload),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`Schema creation failed: ${res.status} ${errTxt}`);
    }

    const result = await res.json();
    const schemaId = result.schema_id || result.sent?.schema_id;
    if (!schemaId) throw new Error('No schema_id returned after creation');

    console.log('Created new schema:', schemaId);
    return {
      schema_id: schemaId,
      schema_name: schemaPayload.schema_name,
      schema_version: schemaPayload.schema_version,
      attributes: schemaPayload.attributes,
    };
  } catch (e) {
    console.error('Error in createOrGetSchema:', e);
    return null;
  }
}

async function createCredentialDefinition(schemaId: string): Promise<string | null> {
  try {
    console.log('Checking/creating credential definition for schema:', schemaId);
    const res = await fetch(`http://localhost:${agentPort}/credential-definitions/created`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error(`Failed to fetch credential definitions: ${res.status}`);
    const data = await res.json();
    const existingCredDefs: string[] = data.credential_definition_ids || [];

    const existing = existingCredDefs.find(cd => cd.includes(schemaId.split(':')[2]));
    if (existing) {
      console.log('Found existing credential definition:', existing);
      return existing;
    }

    const credDefPayload = {
      schema_id: schemaId,
      support_revocation: false,
      tag: `University-Certificate-${Date.now()}`,
    };

    const createRes = await fetch(`http://localhost:${agentPort}/credential-definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credDefPayload),
    });

    if (!createRes.ok) {
      const errTxt = await createRes.text();
      throw new Error(`Credential definition creation failed: ${createRes.status} ${errTxt}`);
    }

    const createResult = await createRes.json();
    const credDefId = createResult.credential_definition_id || createResult.sent?.credential_definition_id;
    if (!credDefId) throw new Error('No credential definition ID returned after creation');

    console.log('Created credential definition:', credDefId);
    return credDefId;
  } catch (e) {
    console.error('Error creating credential definition:', e);
    return null;
  }
}

async function initialize() {
  try {
    if (agentType === '--issuer') {
      console.log('Starting ISSUER agent...');
      const schemaInfo = await createOrGetSchema();
      if (!schemaInfo) throw new Error('Failed to get or create schema');

      saveSchemaInfo(schemaInfo);

      await new Promise(r => setTimeout(r, 2000));

      const credDefId = await createCredentialDefinition(schemaInfo.schema_id);
      if (!credDefId) throw new Error('Failed to create or get credential definition');

      BaseAgentV1.credentialDefinitionId = credDefId;
      BaseAgentV2.credentialDefinitionId = credDefId;

      console.log('Issuer initialized');
      console.log('Schema ID:', schemaInfo.schema_id);
      console.log('Credential Definition ID:', credDefId);

    } else if (agentType === '--verifier') {
      console.log('Starting VERIFIER agent...');
      const sharedSchemaInfo = loadSchemaInfo();

      if (!sharedSchemaInfo) {
        console.warn('No shared schema info found. Start issuer first.');
      } else {
        (BaseAgentV1 as ExtendedBaseAgent).sharedSchemaInfo = sharedSchemaInfo;
        (BaseAgentV2 as ExtendedBaseAgent).sharedSchemaInfo = sharedSchemaInfo;
        console.log('Verifier initialized with shared schema:', sharedSchemaInfo.schema_id);
      }
    }

    app.use('/v2', all_routes_v2);

    app.listen(port, () => {
      console.log(`${agentType === '--issuer' ? 'Issuer' : 'Verifier'} server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

initialize();
