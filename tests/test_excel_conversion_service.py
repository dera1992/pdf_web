from __future__ import annotations

from io import BytesIO
from pathlib import Path
import subprocess
import zipfile

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


def test_convert_word_with_libreoffice_uses_writer_export_filter(monkeypatch):
    captured: dict[str, object] = {}

    def fake_which(name):
        return "/usr/bin/soffice" if name in {"soffice", "libreoffice"} else None

    def fake_run(command, check, capture_output, timeout):
        captured["command"] = command
        outdir = Path(command[-1])
        (outdir / "input.pdf").write_bytes(b"%PDF-1.4\nword")
        return None

    monkeypatch.setattr(services.shutil, "which", fake_which)
    monkeypatch.setattr(services.subprocess, "run", fake_run)

    result = services._convert_word_with_libreoffice(b"docx", "sample.docx")

    assert result is not None
    assert result.startswith(b"%PDF")
    assert "pdf:writer_pdf_Export" in captured["command"]


def test_convert_ppt_with_libreoffice_uses_impress_export_filter(monkeypatch):
    captured: dict[str, object] = {}

    def fake_which(name):
        return "/usr/bin/soffice" if name in {"soffice", "libreoffice"} else None

    def fake_run(command, check, capture_output, timeout):
        captured["command"] = command
        outdir = Path(command[-1])
        (outdir / "input.pdf").write_bytes(b"%PDF-1.4\nppt")
        return None

    monkeypatch.setattr(services.shutil, "which", fake_which)
    monkeypatch.setattr(services.subprocess, "run", fake_run)

    result = services._convert_ppt_with_libreoffice(b"pptx", "sample.pptx")

    assert result is not None
    assert result.startswith(b"%PDF")
    assert "pdf:impress_pdf_Export" in captured["command"]


def test_convert_pdf_with_libreoffice_uses_filter_for_docx(monkeypatch):
    captured: dict[str, object] = {}

    def fake_which(name):
        return "/usr/bin/soffice" if name in {"soffice", "libreoffice"} else None

    def fake_run(command, check, capture_output, timeout):
        captured["command"] = command
        outdir = Path(command[-1])
        (outdir / "input.docx").write_bytes(b"docx-content")

        class Result:
            stderr = b""

        return Result()

    monkeypatch.setattr(services.shutil, "which", fake_which)
    monkeypatch.setattr(services.subprocess, "run", fake_run)

    result = services._convert_pdf_with_libreoffice(b"%PDF-1.4", target_ext="docx")

    assert result == b"docx-content"
    assert "docx" in captured["command"]


def test_convert_pdf_with_libreoffice_retries_plain_extension(monkeypatch):
    calls: list[list[str]] = []

    def fake_which(name):
        return "/usr/bin/soffice" if name in {"soffice", "libreoffice"} else None

    def fake_run(command, check, capture_output, timeout):
        calls.append(command)
        outdir = Path(command[-1])
        if "xlsx" in command and "xlsx:Calc MS Excel 2007 XML" not in command:
            raise subprocess.CalledProcessError(returncode=1, cmd=command)
        (outdir / "input.xlsx").write_bytes(b"xlsx-content")

        class Result:
            stderr = b""

        return Result()

    monkeypatch.setattr(services.shutil, "which", fake_which)
    monkeypatch.setattr(services.subprocess, "run", fake_run)

    result = services._convert_pdf_with_libreoffice(b"%PDF-1.4", target_ext="xlsx")

    assert result == b"xlsx-content"
    assert len(calls) == 2
    assert "xlsx" in calls[0]
    assert "xlsx:Calc MS Excel 2007 XML" in calls[1]


def test_docx_from_text_escapes_xml_entities():
    output = services._docx_from_text("Tom & Jerry <script>\"")
    with zipfile.ZipFile(BytesIO(output)) as archive:
        document_xml = archive.read("word/document.xml")
    assert b"Tom &amp; Jerry &lt;script&gt;\"" in document_xml


def test_xlsx_from_text_removes_illegal_xml_chars():
    output = services._xlsx_from_text("Hello\x00World")
    with zipfile.ZipFile(BytesIO(output)) as archive:
        strings_xml = archive.read("xl/sharedStrings.xml")
    assert b"HelloWorld" in strings_xml
    assert b"\x00" not in strings_xml


def test_pptx_from_text_contains_required_shape_properties():
    output = services._pptx_from_text("Hello deck")
    with zipfile.ZipFile(BytesIO(output)) as archive:
        slide_xml = archive.read("ppt/slides/slide1.xml")
    assert b"<p:spPr>" in slide_xml
    assert b"<a:prstGeom prst=\"rect\">" in slide_xml
    assert b"<p:clrMapOvr>" in slide_xml
