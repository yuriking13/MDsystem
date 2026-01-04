import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  apiGetProject,
  apiUpdateProject,
  apiGetProjectMembers,
  apiInviteProjectMember,
  apiRemoveProjectMember,
  type Project,
  type ProjectMember,
} from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import ArticlesSection from "../components/ArticlesSection";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [inviting, setInviting] = useState(false);

  async function load() {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        apiGetProject(id),
        apiGetProjectMembers(id),
      ]);
      setProject(pRes.project);
      setMembers(mRes.members);
      setEditName(pRes.project.name);
      setEditDesc(pRes.project.description || "");
    } catch (err: any) {
      setError(err?.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSave() {
    if (!id || !project) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiUpdateProject(id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setProject(res.project);
      setEditing(false);
      setOk("Saved!");
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      await apiInviteProjectMember(id, inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setShowInvite(false);
      setOk("Member invited!");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(userId: string, email: string) {
    if (!id) return;
    if (!confirm(`Remove ${email} from project?`)) return;
    setError(null);
    try {
      await apiRemoveProjectMember(id, userId);
      setOk("Member removed");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to remove member");
    }
  }

  const canEdit = project && (project.role === "owner" || project.role === "editor");
  const isOwner = project?.role === "owner";

  if (loading) {
    return (
      <div className="container">
        <div className="card">Loading project…</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="card">
          <div className="alert">{error || "Project not found"}</div>
          <button className="btn" onClick={() => nav("/projects")} type="button">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row space" style={{ marginBottom: 16 }}>
          <button className="btn secondary" onClick={() => nav("/projects")} type="button">
            ← Back
          </button>
          <div className="row gap">
            {canEdit && !editing && (
              <button className="btn secondary" onClick={() => setEditing(true)} type="button">
                Edit
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert">{error}</div>}
        {ok && <div className="ok">{ok}</div>}

        {/* Project info */}
        {editing ? (
          <div className="stack" style={{ marginBottom: 20 }}>
            <label className="stack">
              <span>Project Name</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </label>
            <label className="stack">
              <span>Description</span>
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </label>
            <div className="row gap">
              <button className="btn" onClick={handleSave} disabled={saving} type="button">
                {saving ? "Saving…" : "Save"}
              </button>
              <button className="btn secondary" onClick={() => setEditing(false)} type="button">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1>{project.name}</h1>
            {project.description && (
              <p className="muted" style={{ marginBottom: 16 }}>
                {project.description}
              </p>
            )}
            <div className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
              Your role: <strong>{project.role}</strong> •
              Created: {new Date(project.created_at).toLocaleDateString()} •
              Updated: {new Date(project.updated_at).toLocaleDateString()}
            </div>
          </>
        )}

        {/* Members section */}
        <h2>Team Members</h2>
        
        {isOwner && (
          <div style={{ marginBottom: 12 }}>
            {!showInvite ? (
              <button className="btn" onClick={() => setShowInvite(true)} type="button">
                + Invite Member
              </button>
            ) : (
              <form onSubmit={handleInvite} className="card">
                <div className="stack">
                  <label className="stack">
                    <span>Email</span>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      required
                    />
                  </label>
                  <label className="stack">
                    <span>Role</span>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "viewer" | "editor")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a3a66",
                        background: "#0f1626",
                        color: "#e8eefc",
                      }}
                    >
                      <option value="viewer">Viewer (read only)</option>
                      <option value="editor">Editor (can edit)</option>
                    </select>
                  </label>
                  <div className="row gap">
                    <button className="btn" disabled={inviting} type="submit">
                      {inviting ? "Inviting…" : "Invite"}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => setShowInvite(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="table table-members">
          <div className="thead">
            <div>Email</div>
            <div>Role</div>
            <div>Joined</div>
            <div>{isOwner ? "Actions" : ""}</div>
          </div>
          {members.map((m) => (
            <div className="trow" key={m.user_id}>
              <div className="mono" style={{ fontSize: 13 }}>
                {m.email} {m.user_id === user?.id && "(you)"}
              </div>
              <div>{m.role}</div>
              <div>{new Date(m.joined_at).toLocaleDateString()}</div>
              <div>
                {isOwner && m.role !== "owner" && (
                  <button
                    className="btn secondary"
                    onClick={() => handleRemoveMember(m.user_id, m.email)}
                    type="button"
                    style={{ fontSize: 12, padding: "6px 10px" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Articles Database */}
        {id && <ArticlesSection projectId={id} canEdit={!!canEdit} />}

        <div style={{ marginTop: 24 }}>
          <h2>Documents</h2>
          <p className="muted">
            Coming soon: write your thesis with automatic citations and bibliography
          </p>
        </div>
      </div>
    </div>
  );
}
