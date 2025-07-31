import BaseAgent from './agent.base';
import { Request, Response } from 'express';
import { apiFetch } from '../../utils/network-call';
import { getProofRequest, sendProofRequest } from '../../api_v2';

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

export class ProofController extends BaseAgent {
  static async sendProofRequest(req: Request, res: Response) {
    const { 
      proofRequestlabel, 
      connectionId, 
      version, 
      requested_attributes,
      restriction_type = 'none'
    } = req.body;
  
    if (!proofRequestlabel) {
      return res.status(400).send({ error: 'proofRequestlabel is required' });
    }
    if (!connectionId) {
      return res.status(400).send({ error: 'connectionId is required' });
    }

    const getRestrictions = () => {
      const credDefId = BaseAgent.credentialDefinitionId;
      const sharedSchemaInfo = (BaseAgent as ExtendedBaseAgent).sharedSchemaInfo;
      
      switch (restriction_type) {
        case 'cred_def':
          if (!credDefId) return [];
          return [{ cred_def_id: credDefId }];
        case 'schema':
          if (sharedSchemaInfo?.schema_id) {
            return [{ schema_id: sharedSchemaInfo.schema_id }];
          } else {
            return [{ schema_name: 'University-Certificate' }];
          }
        case 'schema_name':
          const schemaName = sharedSchemaInfo?.schema_name || 'University-Certificate';
          return [{ schema_name: schemaName }];
        case 'issuer_did':
          if (credDefId) {
            const issuerDid = credDefId.split('/')[0];
            return [{ issuer_did: issuerDid }];
          } else {
            return [];
          }
        case 'none':
          return [];
        default:
          return [];
      }
    };

    const restrictions = getRestrictions();
  
    let attributes = requested_attributes;
    
    if (
      !attributes ||
      typeof attributes !== 'object' ||
      Array.isArray(attributes) ||
      Object.keys(attributes).length === 0
    ) {
      attributes = {
        attr1_referent: {
          name: 'username',
          restrictions: restrictions,
        },
        attr2_referent: {
          name: 'email',
          restrictions: restrictions,
        },
        attr3_referent: {
          name: 'occupation',
          restrictions: restrictions,
        },
        attr4_referent: {
          name: 'citizenship',
          restrictions: restrictions,
        },
      };
    } else {
      Object.keys(attributes).forEach(key => {
        if (!attributes[key].restrictions && restrictions.length > 0) {
          attributes[key].restrictions = restrictions;
        }
      });
    }
  
    const requested_predicates = {};

    try {
      const result = await apiFetch(sendProofRequest, 'POST', {
        connection_id: connectionId,
        presentation_request: {
          indy: {
            name: proofRequestlabel,
            version: version || '1.0.0',
            requested_attributes: attributes,
            requested_predicates,
          },
        },
      });
  
      if (result) {
        return res.status(200).send(result);
      } else {
        return res.status(500).send({ error: 'sending proof request failed' });
      }
    } catch (error: any) {
      if (error.message?.includes('schema') || error.message?.includes('1043')) {
        return res.status(500).send({ 
          error: 'Schema-related error in proof request',
          details: error.message || error.toString(),
          suggestions: [
            'Try using restriction_type: "none" for unrestricted proof requests',
            'Try using restriction_type: "schema_name" instead of "schema"',
            'Check if the schema exists using /debug/schemas endpoint',
            'Verify credentials are available using /debug/credentials endpoint'
          ],
        });
      }
      
      return res.status(500).send({ error: error.message || error.toString() });
    }
  }

  static async getAvailableSchemas(req: Request, res: Response) {
    try {
      const agentPort = process.env.AGENT_PORT || '8021';
      const response = await fetch(`http://localhost:${agentPort}/schemas/created`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const responseText = await response.text();
        if (responseText) {
          const schemas = JSON.parse(responseText);
          return res.status(200).send(schemas);
        }
      }
      return res.status(200).send({ schema_ids: [] });
    } catch (error: any) {
      return res.status(500).send({ error: error.message });
    }
  }

  static async getCredentialDefinitions(req: Request, res: Response) {
    try {
      const agentPort = process.env.AGENT_PORT || '8021';
      const response = await fetch(`http://localhost:${agentPort}/credential-definitions/created`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const responseText = await response.text();
        if (responseText) {
          const credDefs = JSON.parse(responseText);
          return res.status(200).send(credDefs);
        }
      }
      return res.status(200).send({ credential_definition_ids: [] });
    } catch (error: any) {
      return res.status(500).send({ error: error.message });
    }
  }
  
  static async getProofRecords(req: Request, res: Response) {
    const { proofRecordId } = req.query;
    try {
      const result = await apiFetch(getProofRequest(proofRecordId), 'GET');
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(500).send({ error: 'fetching proof request failed' });
      }
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  }

  static async getProofData(req: Request, res: Response) {
    const { proofRecordId } = req.params;

    if (!proofRecordId) {
      return res.status(400).send({ error: 'proofRecordId is required' });
    }

    try {
      const result = await apiFetch(getProofRequest(proofRecordId), 'GET');
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(500).send({ error: 'fetching proof request failed' });
      }
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  }
}
