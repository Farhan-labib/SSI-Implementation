import BaseAgent from './agent.base';
import { Request, Response } from 'express';
import { apiFetch } from '../../utils/network-call';
import { getIssuedCredential, issueCredential } from '../../api_v2';

export class CredentialController extends BaseAgent {
  static async issueCredential(req: Request, res: Response) {
    const { connectionId, credential_preview } = req.body;

    if (!connectionId) {
      return res.status(400).send({ error: 'connectionId is required' });
    }

    if (!BaseAgent.credentialDefinitionId) {
      return res.status(400).send({ error: 'credentialDefinitionId is required' });
    }

    let attributes;
    if (credential_preview && credential_preview.attributes) {
      attributes = credential_preview.attributes;
    } else {
      const { username, email, occupation, citizenship } = req.body;
      attributes = [
        { name: 'username', value: `${username ?? 'Farhan Labib Jahin'}` },
        { name: 'email', value: `${email ?? 'farhan@gmail.com'}` },
        { name: 'occupation', value: `${occupation ?? 'Software Engineer'}` },
        { name: 'citizenship', value: `${citizenship ?? 'Bangladesh'}` },
      ];
    }

    if (!Array.isArray(attributes) || attributes.length === 0) {
      return res.status(400).send({ error: 'attributes must be an array with at least one element' });
    }

    for (const attribute of attributes) {
      if (!attribute.name || !attribute.value) {
        return res.status(400).send({ error: 'attributes must have a name and value' });
      }
    }

    try {
      const payload = {
        connection_id: connectionId,
        credential_preview: {
          '@type': 'issue-credential/2.0/credential-preview',
          attributes,
        },
        filter: {
          indy: {
            cred_def_id: BaseAgent.credentialDefinitionId,
          },
        },
      };

      const result = await apiFetch(issueCredential, 'POST', payload);

      if (result) {
        res.status(200).send(result);
      } else {
        res.status(500).send({ error: 'issuing credential failed' });
      }
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  }

  static async issuedCredential(req: Request, res: Response) {
    const { credentialId } = req.query;
    try {
      const result = await apiFetch(getIssuedCredential(credentialId), 'GET');
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(500).send({ error: 'issuing credential failed' });
      }
    } catch (error: any) {
      res.status(500).send({ error: error.message });
    }
  }
}
