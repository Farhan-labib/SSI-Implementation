"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import QRCode from "qrcode";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Alert,
} from "@material-tailwind/react";

const API_BASE_URL = "http://localhost:4002/v2";

const VerifierConnection = () => {
  const [connectionQrCode, setConnectionQrCode] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Not connected");
  const [proofData, setProofData] = useState(null);
  const [revealedAttributes, setRevealedAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [error, setError] = useState("");

  const allAttributes = ["username", "email", "occupation", "citizenship"];

  const handleCheckboxChange = (attr) => {
    setSelectedAttributes((prev) =>
      prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr]
    );
  };

  const createInvitation = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/create-invitation`, {
        label: "Verifier",
        domain: API_BASE_URL,
      });

      const { connection_id, invitation_url, invitationUrl, invitation } = res.data;
      const rawUrl = invitation_url || invitationUrl || invitation?.invitation_url;

      const qr = await QRCode.toDataURL(rawUrl, {
        color: { dark: "#000000", light: "#f3f4f6" },
      });

      setConnectionQrCode(qr);
      setConnectionId(connection_id);
      setConnectionStatus("Invitation created");
    } catch {
      setError("Failed to create invitation");
    }
  };

  const sendProofRequest = async (connectionId) => {
    try {
      const requested_attributes = {};
      selectedAttributes.forEach((attr, idx) => {
        requested_attributes[`attr${idx}_referent`] = { name: attr };
      });

      const payload = {
        proofRequestlabel: "Selective Attribute Proof",
        connectionId,
        version: "1.0.0",
        restriction_type: "none",
        requested_attributes,
      };

      const res = await axios.post(`${API_BASE_URL}/send-proof-request`, payload);
      const exchangeId = res.data.pres_ex_id || res.data.presentation_exchange_id;
      setConnectionStatus("Proof request sent");
      checkProofStatus(exchangeId);
    } catch {
      setError("Error sending proof request");
    }
  };

  const referentToAttributeName = (referent) => {
    const index = parseInt(referent.replace("attr", "").replace("_referent", ""), 10);
    return selectedAttributes[index] || `Attribute ${index}`;
  };

  const extractRevealedAttributes = (proofData) => {
    const revealedAttrs =
      proofData.by_format?.pres?.indy?.requested_proof?.revealed_attrs ||
      proofData.presentation?.requested_proof?.revealed_attrs;

    if (!revealedAttrs) return [];

    return Object.entries(revealedAttrs).map(([referent, attr]) => ({
      name: attr.name || referentToAttributeName(referent),
      value: attr.raw,
    }));
  };

  const checkProofStatus = async (exchangeId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/proof-data/${exchangeId}`);
      const { state, presentation, verified } = res.data;

      if (["verified", "presentation_received", "done"].includes(state) || verified === "true") {
        const proof = presentation || res.data;
        setProofData(proof);
        setRevealedAttributes(extractRevealedAttributes(proof));
        setConnectionStatus("Proof verified");
      } else {
        setTimeout(() => checkProofStatus(exchangeId), 2000);
      }
    } catch {
      setError("Error verifying proof");
    }
  };

  useEffect(() => {
    if (!connectionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/connections?connectionId=${connectionId}`);
        const connection = Array.isArray(res.data) ? res.data[0] : res.data;
        setConnectionStatus(connection.state);

        if (["active", "completed"].includes(connection.state) && !proofData) {
          clearInterval(interval);
          await sendProofRequest(connection.connection_id);
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [connectionId, proofData]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader floated={false} className="bg-blue-500">
        <Typography variant="h4" color="white" className="text-center py-4">
          Proof Request
        </Typography>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert color="red" className="mb-4">
            {error}
          </Alert>
        )}

        {!connectionQrCode && (
          <>
            <Typography variant="h6" className="mb-2">
              Select Attributes to Verify:
            </Typography>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {allAttributes.map((attr) => (
                <label key={attr} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedAttributes.includes(attr)}
                    onChange={() => handleCheckboxChange(attr)}
                    className="accent-blue-500"
                  />
                  <span>{attr}</span>
                </label>
              ))}
            </div>
            <Button
              onClick={createInvitation}
              color="blue"
              disabled={selectedAttributes.length === 0}
            >
              Generate QR Code
            </Button>
          </>
        )}

        {connectionQrCode && (
          <div className="text-center mt-6">
            <div className="flex justify-center p-4 bg-gray-100 rounded-lg">
              <Image
                src={connectionQrCode}
                alt="Connection QR Code"
                width={300}
                height={300}
              />
            </div>
            <Typography variant="small" className="mt-4">
              Scan this QR with your wallet
            </Typography>
            <Typography variant="small" color="gray">
              Status: {connectionStatus}
            </Typography>
          </div>
        )}

        {proofData && (
          <div className="mt-6">
            <Typography variant="h6" className="mb-2">
              Verification Results
            </Typography>
            <Alert color={proofData.verified === "true" ? "green" : "red"} className="mb-4">
              {proofData.verified === "true" ? "Verified" : "Not Verified"}
            </Alert>
            <ul className="text-sm space-y-2">
              {revealedAttributes.map((attr, idx) => (
                <li key={idx} className="flex justify-between border-b pb-1">
                  <span className="font-medium">{attr.name}</span>
                  <span>{attr.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default VerifierConnection;
