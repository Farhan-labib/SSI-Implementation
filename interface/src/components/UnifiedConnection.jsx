"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import axios from "axios";
import Loading from "./loading";
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Alert,
} from "@material-tailwind/react";

const UnifiedConnection = () => {
  const [connectionQrCode, setConnectionQrCode] = useState(null);
  const [oobId, setOobId] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");

  const generateQR = async () => {
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/create-invitation`, {
        label: "Issuer",
        alias: "holder",
        domain: process.env.NEXT_PUBLIC_API_URL,
      });

      const id = res.data.invitation.id || res.data.invitation["@id"];
      const url = res.data.invitationUrl || res.data.invitation_url;

      setOobId(id);
      if (res.data.connection_id) {
        setConnectionId(res.data.connection_id);
      }

      const qr = await QRCode.toDataURL(url, {
        color: { dark: "#000000", light: "#f3f4f6" },
      });

      setConnectionQrCode(qr);
    } catch {
      setError("Failed to generate connection invitation");
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const endpoint = connectionId
        ? `/connections?connectionId=${connectionId}`
        : `/connections?outOfBandId=${oobId}`;

      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`);
      const connection = Array.isArray(res.data) ? res.data[0] : res.data;

      if (connection?.state === "active" || connection?.state === "completed") {
        const id = connection.connection_id || connection.id;
        setIsConnected(true);
        setConnectionId(id);
        localStorage.setItem("holder_connection_id", id);
      }
    } catch {}
  };

  useEffect(() => {
    if (!connectionQrCode) generateQR();
  }, []);

  useEffect(() => {
    if (oobId && !isConnected) {
      const interval = setInterval(checkConnectionStatus, 2000);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setError("Connection timed out");
      }, 180000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [oobId, isConnected]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader floated={false} className="bg-blue-500">
        <Typography variant="h4" color="white" className="text-center py-4">
          Wallet Connection
        </Typography>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert color="red" className="mb-4">
            {error}
          </Alert>
        )}

        {isConnected ? (
          <div className="text-center py-8">
            <Typography variant="h5" color="green" className="mb-4">
              Successfully connected!
            </Typography>
            <Typography className="mb-4">
              Connection ID: {connectionId}
            </Typography>
          </div>
        ) : connectionQrCode ? (
          <div className="text-center">
            <div className="flex justify-center p-4 bg-gray-100 rounded-lg">
              <Image src={connectionQrCode} alt="Connection QR Code" width={300} height={300} />
            </div>
            <Typography variant="small" className="mt-4">
              Scan this QR code with your wallet to connect
            </Typography>
          </div>
        ) : (
          <div className="text-center py-8">
            <Loading />
            <Typography className="mt-4">
              Generating connection QR code...
            </Typography>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default UnifiedConnection;
