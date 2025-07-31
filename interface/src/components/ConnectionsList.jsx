"use client";

import React, { useEffect, useState } from "react";

export default function ConnectionsList() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    occupation: "",
    citizenship: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch("http://localhost:4002/v2/all-connections");
        if (!res.ok) throw new Error(`Error: ${res.status}`);
        const data = await res.json();
        setConnections(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchConnections();
  }, []);

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.username || !formData.email) {
      setFormError("Username and Email are required");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/v2/issue-credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          credential_preview: {
            "@type": "issue-credential/2.0/credential-preview",
            attributes: [
              { name: "username", value: formData.username },
              { name: "email", value: formData.email },
              { name: "occupation", value: formData.occupation },
              { name: "citizenship", value: formData.citizenship },
            ],
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setFormError(errData.error || "Failed to issue credential");
      } else {
        setFormSuccess("Credential issued successfully!");
        setFormData({
          username: "",
          email: "",
          occupation: "",
          citizenship: "",
        });
      }
    } catch (err) {
      setFormError("Error issuing credential");
    }
  };

  if (loading) return <p>Loading connections...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!connections.length) return <p>No connections found.</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      {!selectedConnectionId ? (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {connections.map((conn, index) => (
            <li
              key={conn.connection_id}
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                marginBottom: "1rem",
                borderRadius: "8px",
                background: "#f9f9f9",
              }}
            >
              <strong>{index + 1}. Connection ID:</strong> {conn.connection_id} <br />
              <strong>Status:</strong> {conn.state} <br />
              <strong>Created:</strong>{" "}
              {new Date(conn.created_at).toLocaleString()} <br />
              <button
                onClick={() => setSelectedConnectionId(conn.connection_id)}
                style={{
                  marginTop: "0.7rem",
                  padding: "0.4rem 1rem",
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Issue Credential
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ maxWidth: "400px" }}>
          <h3>Issue Credential for: {selectedConnectionId}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label>
                Username:
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "0.5rem", marginTop: "0.3rem" }}
                  required
                />
              </label>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label>
                Email:
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "0.5rem", marginTop: "0.3rem" }}
                  required
                />
              </label>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label>
                Occupation:
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "0.5rem", marginTop: "0.3rem" }}
                />
              </label>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label>
                Citizenship:
                <input
                  type="text"
                  name="citizenship"
                  value={formData.citizenship}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "0.5rem", marginTop: "0.3rem" }}
                />
              </label>
            </div>
            {formError && <p style={{ color: "red" }}>{formError}</p>}
            {formSuccess && <p style={{ color: "green" }}>{formSuccess}</p>}
            <button
              type="submit"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Issue
            </button>
            <button
              type="button"
              onClick={() => setSelectedConnectionId(null)}
              style={{
                marginLeft: "1rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
