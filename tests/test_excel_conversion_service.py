from __future__ import annotations

from pathlib import Path
import subprocess

from pdf_web.operations import services


def test_convert_excel_with_libreoffice_returns_pdf_when_available(monkeypatch):
    def fake_which(name):
        return "/usr/bin/soffice" if name in {"soffice", "libreoffice"} else None

    def fake_run(command, check, capture_output, timeout):
        outdir = Path(command[-1])
        (outdir / "input.pdf").write_bytes(b"%PDF-1.4\nexcel")
        return None

    monkeypatch.setattr(services.shutil, "which", fake_which)
    monkeypatch.setattr(services.subprocess, "run", fake_run)

    result = services._convert_excel_with_libreoffice(b"xlsx", "sheet.xlsx")

    assert result is not None
    assert result.startswith(b"%PDF")


def test_convert_excel_with_libreoffice_falls_back_when_converter_fails(monkeypatch):
    monkeypatch.setattr(services.shutil, "which", lambda *_args, **_kwargs: "/usr/bin/soffice")

    def fail_run(*_args, **_kwargs):
        raise subprocess.CalledProcessError(returncode=1, cmd=["soffice"])

    monkeypatch.setattr(services.subprocess, "run", fail_run)

    result = services._convert_excel_with_libreoffice(b"xlsx", "sheet.xlsx")

    assert result is None
