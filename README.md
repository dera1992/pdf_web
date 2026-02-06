# pdf_web

A pdf handling project

[![Built with Cookiecutter Django](https://img.shields.io/badge/built%20with-Cookiecutter%20Django-ff69b4.svg?logo=cookiecutter)](https://github.com/cookiecutter/cookiecutter-django/)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)

License: MIT

## Settings

Moved to [settings](http://cookiecutter-django.readthedocs.io/en/latest/settings.html).

## Basic Commands

### Setting Up Your Users

- To create a **normal user account**, just go to Sign Up and fill out the form. Once you submit it, you'll see a "Verify Your E-mail Address" page. Go to your console to see a simulated email verification message. Copy the link into your browser. Now the user's email should be verified and ready to go.

- To create a **superuser account**, use this command:

      $ python manage.py createsuperuser

For convenience, you can keep your normal user logged in on Chrome and your superuser logged in on Firefox (or similar), so that you can see how the site behaves for both kinds of users.

### Type checks

Running type checks with mypy:

    $ mypy pdf_web

### Test coverage

To run the tests, check your test coverage, and generate an HTML coverage report:

    $ coverage run -m pytest
    $ coverage html
    $ open htmlcov/index.html

#### Running tests with pytest

    $ pytest

### Live reloading and Sass CSS compilation

Moved to [Live reloading and SASS compilation](https://cookiecutter-django.readthedocs.io/en/latest/developing-locally.html#sass-compilation-live-reloading).

### Celery

This app comes with Celery.

To run a celery worker:

```bash
cd pdf_web
celery -A config.celery_app worker -l info
```

Please note: For Celery's import magic to work, it is important _where_ the celery commands are run. If you are in the same folder with _manage.py_, you should be right.

To run [periodic tasks](https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html), you'll need to start the celery beat scheduler service. You can start it as a standalone process:

```bash
cd pdf_web
celery -A config.celery_app beat
```

or you can embed the beat service inside a worker with the `-B` option (not recommended for production use):

```bash
cd pdf_web
celery -A config.celery_app worker -B -l info
```

### Email Server

In development, it is often nice to be able to see emails that are being sent from your application. For that reason local SMTP server [Mailpit](https://github.com/axllent/mailpit) with a web interface is available as docker container.

Container mailpit will start automatically when you will run all docker containers.
Please check [cookiecutter-django Docker documentation](http://cookiecutter-django.readthedocs.io/en/latest/deployment-with-docker.html) for more details how to start all containers.

With Mailpit running, to view messages that are sent by your application, open your browser and go to `http://127.0.0.1:8025`

### Sentry

Sentry is an error logging aggregator service. You can sign up for a free account at <https://sentry.io/signup/?code=cookiecutter> or download and host it yourself.
The system is set up with reasonable defaults, including 404 logging and integration with the WSGI application.

You must set the DSN url in production.

## Deployment

The following details how to deploy this application.

### Docker

See detailed [cookiecutter-django Docker documentation](http://cookiecutter-django.readthedocs.io/en/latest/deployment-with-docker.html).

## PDF Web Backend (Multi-tenant)

### Development with Docker

```bash
docker compose up --build
```

The stack includes the Django web service, Celery worker, Celery beat, PostgreSQL, and Redis. API is available at `http://localhost:8000/api/` and media at `http://localhost:8000/media/`.

### Celery Worker (manual)

```bash
celery -A config.celery_app worker -l info
celery -A config.celery_app beat -l info
```

### OCR Dependencies

OCR uses `ocrmypdf` and system binaries (e.g., Tesseract, Ghostscript). Install these in your container or host OS to enable OCR tasks. If not installed, OCR jobs will fail with a clear error message.

### S3 Storage (Production)

Set the following environment variables and `STORAGE_BACKEND=s3`:

```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_STORAGE_BUCKET_NAME=...
AWS_S3_REGION_NAME=...
```

Downloads and previews will use signed URLs when S3 is enabled.

### API Overview

Key endpoints (all under `/api/`):
- Documents: `/api/documents/`, `/api/documents/{id}/versions/`, `/api/versions/{id}/pages/`, `/api/versions/{id}/bookmarks/`
- Search: `/api/versions/{id}/search/`
- Annotations: `/api/versions/{id}/annotations/`, `/api/annotations/{id}/`
- Operations: `/api/operations/{job_id}/`, `/api/operations/merge/` (and split/reorder/rotate/delete-pages/compress)
- AI/OCR: `/api/versions/{id}/ocr/`, `/api/versions/{id}/embed/`, `/api/documents/{id}/chat/`, `/api/chat/{id}/message/`
- Security: `/api/versions/{id}/encrypt/`, `/api/versions/{id}/watermark/`, `/api/versions/{id}/permissions/`
- Audit: `/api/audit/`
