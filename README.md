<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">

### 📁 Structure

```
├── acapy/                    # ACA-Py repository (cloned from OpenWallet Foundation)
├── SSI-Implementation/       # Main project repository
│   ├── demo/
│   │   └── acapy/           # Backend API for issuer/verifier agents
│   └── interface/           # Frontend web interface
```

### ⚙️ Prerequisites

<div style="border-left: 4px solid #007bff; padding-left: 20px; margin: 15px 0;">

* Docker (>= v24.0.1)
* Node.js (>= v16)
* Python (>= 3.12)
* Yarn (>= v1.22.22)
* Git
* Ngrok

</div>

---

### 🧪 ACA-Py Agent Setup (`acapy/` – cloned separately)

> Clone the official ACA-Py repo from OpenWallet

```bash
# Clone OpenWallets official ACA-Py repository
git clone -b 0.12.3 https://github.com/openwallet-foundation/acapy.git

# Navigate to demo folder
cd acapy/demo

# Update asyncpg version to avoid compatibility issues
sed -i 's/asyncpg.*/asyncpg~=0.28.0/' requirements.txt
```

#### Install dependencies

```bash
# Install requirements
python3 -m pip install -r requirements.txt

# If using Python >= 3.12 and Debian Based Systems (Like Ubuntu), avoid environment errors:
python3 -m pip install -r requirements.txt --break-system-packages
```

#### Start the agent

```bash
# Start Ngrok for port 8020
ngrok http 8020

# Navigate to acapy demo directory
cd acapy/demo

# Run demo agent with Faber configuration
LEDGER_URL=http://dev.greenlight.bcovrin.vonx.io ./run_demo faber
```

---

### 🖥️ Server Setup (`SSI-Implementation/demo/acapy`)

```bash
# Navigate to your main project folder (where you have acapy)
# Clone this repository
git clone https://github.com/Farhan-labib/SSI-Implementation.git

# Navigate to the backend directory
cd SSI-Implementation/demo/acapy

# Environment setup - copy sample environment file
cp .env.sample .env
# Edit .env file with correct variables for your setup

# Install dependencies
yarn install

# Start server as issuer
yarn issuer

# In another Terminal and from the same directory start server as verifier
yarn verifier
```

---

### 💻 Interface Setup (`SSI-Implementation/interface`)

```bash
# Navigate to interface directory
cd SSI-Implementation/interface

# Copy environment configuration
cp .env.sample .env

# For API v2 (recommended)
NEXT_PUBLIC_API_URL=http://{your_ip_address}:4000/v2

# For API v1 (not recommended)
# NEXT_PUBLIC_API_URL=http://{your_ip_address}:4000/v1

# Install dependencies
yarn install

# Start development server
yarn dev
```

---

### 📱 Mobile Wallet Setup

Download the **Bifold app** from:

👉 [`Click here to download`](https://drive.google.com/uc?export=download&id=10Qv5FNXOsp6-kyafJefXYYSe_v5bpfuq)

After installing:

* Create a 6-digit PIN to log in
* You can:
  * Connect with issuers/verifiers
  * Store credentials
  * Present proofs
  * Make your own invitation QR Code and share it with other parties

---

### 🌐 Access Your Application

Once all services are running, you can access the application at:

<div style="border-left: 4px solid #007bff; padding-left: 20px; margin: 15px 0;">

* **Request Credentials**: http://localhost:3000 ← Use this to request credentials
* **Issue Credentials**: http://localhost:3000/issuer ← Use this to give credentials
* **Verify Credentials**: http://localhost:3000/verifier ← Use this to verify credentials

</div>

</div>
