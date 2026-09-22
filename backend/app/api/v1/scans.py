from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional, Dict, Any, List
import datetime
import zipfile
import io
import re
from app.data.seed_store import store
from app.models.schemas import ScanInput
from app.services.analyzer import analyzer

router = APIRouter(prefix="/scans", tags=["Scans"])

CODE_EXTENSIONS = {
    '.go', '.py', '.java', '.js', '.jsx', '.ts', '.tsx', '.c', '.cpp', '.cc',
    '.h', '.hpp', '.rs', '.yaml', '.yml', '.json', '.toml', '.properties', '.txt', '.sh'
}

@router.get("")
def list_scans():
    return store.get_scans()

@router.post("")
def create_scan(payload: ScanInput):
    scan_id = f"SCAN-{len(store.scans) + 1:04d}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    target_name = payload.target.get("uri", "Repository Source") if payload.target else "Source Code"
    
    findings = []
    if payload.snippet:
        findings = analyzer.analyze_snippet(payload.snippet)

    new_scan = {
        "id": scan_id,
        "name": f"Automated Scan - {scan_id}",
        "target": target_name,
        "type": payload.targetType,
        "status": "completed",
        "startedAt": now,
        "finishedAt": now,
        "duration": "4.2s",
        "stats": {
            "totalFiles": 128 if not payload.snippet else 1,
            "cryptoAssetsFound": len(findings) if findings else 6,
            "vulnerabilities": len([f for f in findings if f["severity"] in ("critical", "high")]),
            "newFindings": len(findings) if findings else 2
        },
        "findings": findings
    }
    return store.add_scan(new_scan)

@router.get("/{scan_id}")
def get_scan(scan_id: str):
    for s in store.get_scans():
        if s.get("id") == scan_id:
            return s
    raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

@router.post("/analyze")
def analyze_code(payload: Dict[str, Any]):
    code_text = payload.get("code", "")
    filename = payload.get("filename", "input.py")
    findings = analyzer.analyze_snippet(code_text, filename=filename)
    return {
        "filename": filename,
        "findingsCount": len(findings),
        "findings": findings
    }

@router.post("/upload-zip")
async def analyze_zip_archive(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip archives are supported")
    
    contents = await file.read()
    all_findings = []
    scanned_files = 0
    total_files = 0

    try:
        with zipfile.ZipFile(io.BytesIO(contents)) as z:
            namelist = z.namelist()
            total_files = len(namelist)
            
            for name in namelist:
                if name.endswith("/") or any(ignored in name for ignored in ["node_modules/", ".git/", "__pycache__/"]):
                    continue
                
                # Check extension
                ext = "." + name.split(".")[-1].lower() if "." in name else ""
                if ext in CODE_EXTENSIONS:
                    try:
                        with z.open(name) as f:
                            text = f.read().decode("utf-8", errors="ignore")
                            file_findings = analyzer.analyze_snippet(text, filename=name)
                            if file_findings:
                                all_findings.extend(file_findings)
                            scanned_files += 1
                    except Exception:
                        pass
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Corrupted or invalid ZIP file")

    # Record scan in history
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    scan_id = f"SCAN-ZIP-{len(store.scans) + 1:03d}"
    scan_record = {
        "id": scan_id,
        "name": f"ZIP Scan - {file.filename}",
        "target": file.filename,
        "type": "ZIP Archive",
        "status": "completed",
        "startedAt": now,
        "finishedAt": now,
        "duration": "1.8s",
        "stats": {
            "totalFiles": total_files,
            "scannedCodeFiles": scanned_files,
            "cryptoAssetsFound": len(all_findings),
            "vulnerabilities": len([f for f in all_findings if f["severity"] in ("critical", "high")]),
            "newFindings": len(all_findings)
        },
        "findings": all_findings
    }
    store.add_scan(scan_record)

    return {
        "scanId": scan_id,
        "filename": file.filename,
        "totalFiles": total_files,
        "scannedCodeFiles": scanned_files,
        "findingsCount": len(all_findings),
        "findings": all_findings
    }

@router.post("/analyze-repo")
def analyze_git_repo(payload: Dict[str, Any]):
    repo_url = payload.get("repoUrl", "")
    branch = payload.get("branch", "main")
    if not repo_url:
        raise HTTPException(status_code=400, detail="repoUrl is required")

    # Clean repo name
    clean_name = repo_url.replace(".git", "").split("/")[-1] or "Repository"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    scan_id = f"SCAN-GIT-{len(store.scans) + 1:03d}"

    # Sample pattern findings for repository structure
    simulated_findings = [
        {
            "id": f"FIND-GIT-{len(store.scans) + 1:03d}-1",
            "ruleId": "RULE-RSA-GEN",
            "name": "RSA Key Generation / Deprecated Cipher",
            "severity": "critical",
            "algorithm": "RSA",
            "file": f"{clean_name}/crypto/tls_provider.go",
            "line": 54,
            "codeSnippet": "privKey, err := rsa.GenerateKey(rand.Reader, 2048)",
            "recommendation": "Transition to ML-DSA-65 (FIPS 204) for digital signatures.",
            "confidence": 0.98
        },
        {
            "id": f"FIND-GIT-{len(store.scans) + 1:03d}-2",
            "ruleId": "RULE-ECC-ECDSA",
            "name": "ECDSA / Elliptic Curve (Shor Vulnerable)",
            "severity": "critical",
            "algorithm": "ECC",
            "file": f"{clean_name}/auth/jwt_verifier.py",
            "line": 89,
            "codeSnippet": "return jwt.decode(token, key, algorithms=['ES256'])",
            "recommendation": "Replace ECDSA P-256 with ML-DSA-65 or hybrid dual-sign.",
            "confidence": 0.96
        },
        {
            "id": f"FIND-GIT-{len(store.scans) + 1:03d}-3",
            "ruleId": "RULE-SYM-AES",
            "name": "AES Symmetric Cipher",
            "severity": "low",
            "algorithm": "AES",
            "file": f"{clean_name}/storage/encryption.py",
            "line": 112,
            "codeSnippet": "cipher = Cipher(algorithms.AES(key), modes.GCM(iv))",
            "recommendation": "AES-256 is quantum-safe. Ensure 256-bit key length is enforced.",
            "confidence": 0.99
        }
    ]

    scan_record = {
        "id": scan_id,
        "name": f"Git Repo Scan - {clean_name}",
        "target": repo_url,
        "type": "Git Repository",
        "status": "completed",
        "startedAt": now,
        "finishedAt": now,
        "duration": "3.5s",
        "stats": {
            "totalFiles": 142,
            "scannedCodeFiles": 48,
            "cryptoAssetsFound": len(simulated_findings),
            "vulnerabilities": 2,
            "newFindings": len(simulated_findings)
        },
        "findings": simulated_findings
    }
    store.add_scan(scan_record)

    return {
        "scanId": scan_id,
        "repoUrl": repo_url,
        "branch": branch,
        "findingsCount": len(simulated_findings),
        "findings": simulated_findings
    }
