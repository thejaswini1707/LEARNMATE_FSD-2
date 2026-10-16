import { useCallback, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuBookOpen, LuSearch, LuUpload } from "react-icons/lu";
import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_MB, ROLES } from "../config";
import { KEYS, addMaterial, fetchMaterialFile, listMaterials, removeMaterial } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { formatBytes } from "../utils/format";
import ResourceCard from "../components/ResourceCard";
import Button from "../components/ui/Button";
import { CardSkeletons, EmptyState, ErrorState } from "../components/ui/Feedback";
import { Input, Select, Textarea } from "../components/ui/Field";
import Modal, { ConfirmDialog } from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Pagination from "../components/ui/Pagination";

const PAGE_SIZE = 9;
const EMPTY_FORM = { title: "", subject: "", description: "" };

function UploadModal({ open, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Keep the latest onClose in a ref so `close` can have a stable identity.
  // A changing onClose makes the Modal re-run its focus effect on every keystroke.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const close = useCallback(() => {
    setForm(EMPTY_FORM);
    setFile(null);
    setErrors({});
    setLoading(false);
    onCloseRef.current();
  }, []);

  const pick = (e) => {
    const picked = e.target.files[0];
    if (!picked) return;
    const name = picked.name.toLowerCase();
    if (!ALLOWED_UPLOAD_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setErrors((p) => ({ ...p, file: "Please choose a PDF, DOC, DOCX, PPT or PPTX file." }));
      e.target.value = "";
      return;
    }
    if (picked.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setErrors((p) => ({ ...p, file: `This file is larger than ${MAX_UPLOAD_MB} MB. Please choose a smaller one.` }));
      e.target.value = "";
      return;
    }
    setErrors((p) => ({ ...p, file: undefined }));
    setFile(picked);
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.title.trim()) found.title = "Give your material a title.";
    if (!form.subject.trim()) found.subject = "Enter a subject.";
    if (!file) found.file = "Choose a file to upload.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      await addMaterial(user, { ...form, title: form.title.trim(), subject: form.subject.trim(), file });
      toast.success("Material uploaded.");
      close();
    } catch (err) {
      setErrors({ form: err.message });
      setLoading(false);
  
    }
  };

  return (
    <Modal open={open} onClose={close} title="Upload study material" description={`PDF, DOC, DOCX, PPT or PPTX, up to ${MAX_UPLOAD_MB} MB.`}
      footer={<><Button variant="secondary" onClick={close} disabled={loading}>Cancel</Button><Button type="submit" form="upload-form" loading={loading} icon={LuUpload}>{loading ? "Uploading…" : "Upload"}</Button></>}>
      <form id="upload-form" className="stack" onSubmit={submit} noValidate>
        {errors.form && <div className="alert alert--error" role="alert">{errors.form}</div>}
        <Input label="Title" placeholder="Java OOP notes, unit 2" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} error={errors.title} required />
        <Input label="Subject" placeholder="e.g. Java, DBMS, Operating Systems" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} error={errors.subject} required />
        <Textarea label="Description" rows={3} placeholder="What does this cover?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <div className="field">
          <span className="field__label">File<span className="req" aria-hidden="true">*</span></span>
          <input ref={fileRef} id="material-file" className="sr-only" type="file" accept={ALLOWED_UPLOAD_EXTENSIONS.join(",")} onChange={pick} aria-describedby="file-msg" />
          <label htmlFor="material-file" className={`dropzone ${errors.file ? "dropzone--error" : ""}`}>
            <LuUpload size={20} aria-hidden="true" />
            <span>{file ? <><strong>{file.name}</strong> · {formatBytes(file.size)}</> : "Choose a file from your device"}</span>
          </label>
          {errors.file && <span className="field__error" id="file-msg" role="alert">{errors.file}</span>}
        </div>
      </form>
    </Modal>
  );
}

function Materials() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ q: "", subject: "", sort: "new" });
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const uploadOpen = params.get("upload") === "1";
  const setUploadOpen = useCallback(
    (open) => setParams(open ? { upload: "1" } : {}, { replace: true }),
    [setParams]
  );
  const closeUpload = useCallback(() => setUploadOpen(false), [setUploadOpen]);

  const load = useCallback(() => listMaterials(), []);
  const { data, error, loading, reload } = useAsync(load, [KEYS.materialsVersion]);

  // Subject filter options come from the materials that actually exist.
  const subjectOptions = useMemo(
    () => (data ? [...new Set(data.map((m) => m.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b)) : []),
    [data]
  );

  const results = useMemo(() => {
    if (!data) return [];
    const q = filters.q.trim().toLowerCase();
    const list = data.filter((m) =>
      (!filters.subject || m.subject === filters.subject) &&
      (!q || [m.title, m.subject, m.uploadedBy, m.description].some((v) => (v || "").toLowerCase().includes(q))));
    return filters.sort === "title" ? list.sort((a, b) => a.title.localeCompare(b.title)) : list;
  }, [data, filters]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const update = (name) => (e) => { setFilters((f) => ({ ...f, [name]: e.target.value })); setPage(1); };

  const open = async (item, download) => {
    let blob;
    try {
      blob = await fetchMaterialFile(item);
    } catch {
      toast.error("The file for this material isn't available right now.");
      return;
    }
    const url = URL.createObjectURL(blob);
    if (download) {
      const a = document.createElement("a");
      a.href = url; a.download = item.fileName || item.title;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  };

  const confirmRemove = async () => {
    setBusy(true);
    try {
      await removeMaterial(removing.id, user);
      toast.success("Material removed.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  const canRemove = (m) => user.role === ROLES.ADMIN || !m.uploaderEmail || m.uploaderEmail === user.email;
  const uploadBtn = user.role !== ROLES.ADMIN && <Button icon={LuUpload} onClick={() => setUploadOpen(true)}>Upload notes</Button>;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: user.role === ROLES.ADMIN ? "/admin" : "/dashboard" }, { label: "Materials" }]}
        title="Study materials"
        description="Notes, documents and slides shared by students and tutors. Browse by subject, then view or download."
        meta={data ? [{ label: "materials shared", value: data.length }, { label: "subjects covered", value: subjectOptions.length }] : undefined}
        actions={uploadBtn}
      />

      <div className="card toolbar" role="search">
        <div className="input-wrap">
          <LuSearch size={16} aria-hidden="true" />
          <input type="search" className="control" placeholder="Search by title, subject or uploader" aria-label="Search materials" value={filters.q} onChange={update("q")} />
        </div>
        <Select aria-label="Subject" value={filters.subject} onChange={update("subject")}>
          <option value="">All subjects</option>
          {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select aria-label="Sort by" value={filters.sort} onChange={update("sort")}>
          <option value="new">Newest first</option>
          <option value="title">Title A–Z</option>
        </Select>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? <CardSkeletons count={6} /> : error && !data ? <ErrorState onRetry={reload} /> : !data.length ? (
          <EmptyState icon={LuBookOpen} title="No study materials yet" message="Be the first to share notes with your batch."
            action={uploadBtn || null} />
        ) : (
          <>
            <div className="results-meta" aria-live="polite">
              <span>{results.length} material{results.length === 1 ? "" : "s"} found</span>
              {(filters.q || filters.subject) && <Button variant="ghost" size="sm" onClick={() => { setFilters({ q: "", subject: "", sort: filters.sort }); setPage(1); }}>Clear filters</Button>}
            </div>
            {results.length ? (
              <>
                <div className="grid-cards">
                  {visible.map((m) => <ResourceCard key={m.id} item={m} canRemove={canRemove(m)} onView={(i) => open(i, false)} onDownload={(i) => open(i, true)} onRemove={setRemoving} />)}
                </div>
                <Pagination page={current} pages={pages} total={results.length} pageSize={PAGE_SIZE} onChange={setPage} />
              </>
            ) : (
              <EmptyState icon={LuSearch} title="No materials match your search" message="Try another keyword or pick a different subject." />
            )}
          </>
        )}
      </div>

      <UploadModal key={uploadOpen ? "open" : "closed"} open={uploadOpen} onClose={closeUpload} />
      <ConfirmDialog open={!!removing} loading={busy} title="Remove this material?" message={removing ? `“${removing.title}” will be deleted from LearnMate. This can't be undone.` : ""}
        confirmLabel="Remove" onCancel={() => setRemoving(null)} onConfirm={confirmRemove} />
    </>
  );
}

export default Materials;