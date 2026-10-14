import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readSheet } from "read-excel-file/browser";
import writeExcelFile from "write-excel-file/browser";
import Navbar from "../components/Navbar";
import { parseListingCsv } from "../services/listingCsv";

const maxFileSize = 5 * 1024 * 1024;
const acceptedStudentId = /^PDM-20\d{2}-\d{6}$/;

function getColumn(row, ...names) {
  for (const name of names) {
    if (row[name] !== undefined) return String(row[name]).trim();
  }

  return "";
}

function parseImportFile(file) {
  if (!/\.xlsx$/i.test(file.name)) {
    throw new Error("Choose an Excel workbook (.xlsx).");
  }
  if (file.size > maxFileSize) {
    throw new Error("The Excel file must be smaller than 5 MB.");
  }

  return readSheet(file).then((sheet) => {
    const [headerRow, ...rows] = sheet;
    if (!headerRow || rows.length === 0) {
      throw new Error("The worksheet does not contain any user rows.");
    }

    const headers = headerRow.map((value) =>
      String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_"),
    );
    return rows
      .map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(({ row }) => row.some((value) => String(value ?? "").trim()))
      .map(({ row, rowNumber }) => {
        const normalizedRow = Object.fromEntries(
          headers.map((header, column) => [header, row[column] ?? ""]),
        );
        const fullName = getColumn(normalizedRow, "name", "full_name", "fullname");
        const studentId = getColumn(normalizedRow, "student_id", "studentid").toUpperCase();
        const email = getColumn(normalizedRow, "email").toLowerCase();

        if (!acceptedStudentId.test(studentId)) {
          throw new Error(`Row ${rowNumber} must have a valid student_id value.`);
        }
        if (fullName.length > 200) {
          throw new Error(`Row ${rowNumber} name must be 200 characters or fewer.`);
        }

        return { fullName, studentId, email };
      });
  });
}

export default function AdminTools() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const listingCsvInputRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [listingCsvFile, setListingCsvFile] = useState(null);
  const [isListingImporting, setIsListingImporting] = useState(false);
  const [listingImportReport, setListingImportReport] = useState(null);
  const [listingForm, setListingForm] = useState({
    title: "",
    company: "",
    location: "",
    description: "",
    listing_type: "job",
    external_url: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isAdmin = window.localStorage.getItem("careerera_is_admin") === "true";
  const token = window.localStorage.getItem("careerera_auth_token");

  const loadUsers = useCallback(async (signal) => {
    const response = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        window.localStorage.removeItem("careerera_is_admin");
        window.localStorage.removeItem("careerera_auth_token");
        navigate("/home", { replace: true });
      }
      throw new Error(result.message || "Unable to load users.");
    }

    setUsers(result.users);
  }, [navigate, token]);

  useEffect(() => {
    if (!isAdmin || !token) {
      navigate("/home", { replace: true });
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const requestTimer = window.setTimeout(() => {
      loadUsers(controller.signal)
        .catch((loadError) => {
          if (isMounted && loadError.name !== "AbortError") setError(loadError.message);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(requestTimer);
      controller.abort();
    };
  }, [isAdmin, loadUsers, navigate, token]);

  async function exportUsers() {
    setError("");
    try {
      const rows = [
        ["name", "student_id", "email"],
        ...users.map((user) => [user.fullName ?? "", user.studentId ?? "", user.email ?? ""]),
      ];
      const blob = await writeExcelFile(rows).toBlob();
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = "careera-users.xlsx";
      downloadLink.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (exportError) {
      setError(exportError.message || "Unable to export users.");
    }
  }

  async function importUsers() {
    if (!selectedFile) {
      setError("Choose an Excel file to import.");
      return;
    }

    setIsImporting(true);
    setError("");
    setNotice("");

    try {
      const importedUsers = await parseImportFile(selectedFile);
      const response = await fetch("/api/admin/users/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ users: importedUsers }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to import users.");
      }

      setNotice(`Imported ${result.importedCount} user(s). Skipped ${result.skippedCount} existing user(s).`);
      setSelectedFile(null);
      setIsImportOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadUsers();
    } catch (importError) {
      setError(importError.message || "Unable to import users.");
    } finally {
      setIsImporting(false);
    }
  }

  async function postListings(listings) {
    const response = await fetch("/api/admin/job-listings/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ listings }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to import job listings.");
    }

    setListingImportReport(result);
    return result;
  }

  async function importListingCsv() {
    if (!listingCsvFile) {
      setError("Choose a CSV file to import.");
      return;
    }
    if (listingCsvFile.size > maxFileSize) {
      setError("The CSV file must be smaller than 5 MB.");
      return;
    }

    setIsListingImporting(true);
    setError("");
    setNotice("");
    setListingImportReport(null);

    try {
      const listings = parseListingCsv(await listingCsvFile.text());
      await postListings(listings);
      setListingCsvFile(null);
      if (listingCsvInputRef.current) listingCsvInputRef.current.value = "";
    } catch (importError) {
      setError(importError.message || "Unable to import job listings.");
    } finally {
      setIsListingImporting(false);
    }
  }

  async function addSingleListing(event) {
    event.preventDefault();
    setIsListingImporting(true);
    setError("");
    setNotice("");
    setListingImportReport(null);

    try {
      const result = await postListings([listingForm]);
      if (result.rejected.length === 0) {
        setListingForm({
          title: "",
          company: "",
          location: "",
          description: "",
          listing_type: "job",
          external_url: "",
        });
      }
    } catch (submitError) {
      setError(submitError.message || "Unable to add the job listing.");
    } finally {
      setIsListingImporting(false);
    }
  }

  const listingReport = listingImportReport && (
    <div className="developer-tools-listing-report" role="status">
      <p>
        {listingImportReport.inserted} inserted · {listingImportReport.updated} updated ·{" "}
        {listingImportReport.rejected.length} rejected
      </p>
      {listingImportReport.rejected.length > 0 && (
        <ul>
          {listingImportReport.rejected.map(({ row, reason }) => (
            <li key={`${row}-${reason}`}>Row {row}: {reason}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Navbar>
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">CAREERA / ADMINISTRATION</p>
          <h1>Developer tools</h1>
          <p className="dashboard-subtitle">
            Manage student accounts and job listings.
          </p>
        </div>
        {activeTab === "users" && (
          <div className="developer-tools-actions">
            <button className="dashboard-assessment-link" type="button" onClick={exportUsers}>
              Export table
            </button>
            <button
              className="dashboard-assessment-link developer-tools-import-button"
              type="button"
              onClick={() => {
                setError("");
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                setIsImportOpen(true);
              }}
            >
              Import Excel
            </button>
          </div>
        )}
      </div>

      {error && <p className="developer-tools-message error" role="alert">{error}</p>}
      {notice && <p className="developer-tools-message" role="status">{notice}</p>}

      <div className="developer-tools-tabs" role="tablist" aria-label="Admin tools">
        <button
          id="users-tab"
          className={activeTab === "users" ? "developer-tools-tab active" : "developer-tools-tab"}
          type="button"
          role="tab"
          aria-selected={activeTab === "users"}
          aria-controls="users-panel"
          onClick={() => {
            setActiveTab("users");
            setError("");
            setNotice("");
          }}
        >
          Users
        </button>
        <button
          id="listings-tab"
          className={activeTab === "listings" ? "developer-tools-tab active" : "developer-tools-tab"}
          type="button"
          role="tab"
          aria-selected={activeTab === "listings"}
          aria-controls="listings-panel"
          onClick={() => {
            setActiveTab("listings");
            setError("");
            setNotice("");
          }}
        >
          Job listings
        </button>
      </div>

      {activeTab === "users" && (
        <section
          className="developer-tools-card"
          id="users-panel"
          role="tabpanel"
          aria-labelledby="users-tab"
        >
        <div className="developer-tools-card-heading">
          <div>
            <h2 id="users-heading">Users</h2>
            <p>{users.length} account{users.length === 1 ? "" : "s"} in the database</p>
          </div>
        </div>

        {isLoading ? (
          <p className="developer-tools-empty">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="developer-tools-empty">No users found.</p>
        ) : (
          <div className="developer-tools-table-wrap">
            <table className="developer-tools-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Student ID</th>
                  <th scope="col">Email</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={`${user.email}-${user.studentId ?? ""}`}>
                    <td>{user.fullName || "—"}</td>
                    <td>{user.studentId || "—"}</td>
                    <td>{user.email || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </section>
      )}

      {activeTab === "listings" && (
        <div id="listings-panel" role="tabpanel" aria-labelledby="listings-tab">
          {listingReport}
          <section className="developer-tools-card" aria-labelledby="listing-import-heading">
            <div className="developer-tools-card-heading">
              <div>
                <h2 id="listing-import-heading">Import job listings from CSV</h2>
                <p>
                  CSV columns: title, company, location, description, listing_type, external_url.
                  Listing type must be job or practicum.
                </p>
              </div>
            </div>
            <div className="developer-tools-listing-content">
              <label className="developer-tools-file-label" htmlFor="job-listings-csv">
                CSV file (.csv)
              </label>
              <input
                ref={listingCsvInputRef}
                id="job-listings-csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setListingCsvFile(event.target.files?.[0] ?? null);
                  setError("");
                  setListingImportReport(null);
                }}
              />
              {listingCsvFile && (
                <p className="developer-tools-selected-file">{listingCsvFile.name}</p>
              )}
              <button
                className="dashboard-assessment-link"
                type="button"
                onClick={importListingCsv}
                disabled={isListingImporting}
              >
                {isListingImporting ? "Importing…" : "Import listings"}
              </button>
            </div>
          </section>

          <section className="developer-tools-card developer-tools-listing-form-card">
            <div className="developer-tools-card-heading">
              <div>
                <h2 id="add-listing-heading">Add one listing</h2>
                <p>Manually add or update a listing using its external URL.</p>
              </div>
            </div>
            <form className="developer-tools-listing-content" onSubmit={addSingleListing}>
              <div className="developer-tools-listing-form">
                <label>
                  Title
                  <input
                    name="title"
                    value={listingForm.title}
                    onChange={(event) => setListingForm({ ...listingForm, title: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Company
                  <input
                    name="company"
                    value={listingForm.company}
                    onChange={(event) => setListingForm({ ...listingForm, company: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Location
                  <input
                    name="location"
                    value={listingForm.location}
                    onChange={(event) => setListingForm({ ...listingForm, location: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Listing type
                  <select
                    name="listing_type"
                    value={listingForm.listing_type}
                    onChange={(event) => setListingForm({ ...listingForm, listing_type: event.target.value })}
                  >
                    <option value="job">Job</option>
                    <option value="practicum">Practicum</option>
                  </select>
                </label>
                <label className="developer-tools-listing-description">
                  Description
                  <textarea
                    name="description"
                    value={listingForm.description}
                    onChange={(event) => setListingForm({ ...listingForm, description: event.target.value })}
                    rows="4"
                    required
                  />
                </label>
                <label className="developer-tools-listing-url">
                  External URL
                  <input
                    name="external_url"
                    type="url"
                    value={listingForm.external_url}
                    onChange={(event) => setListingForm({ ...listingForm, external_url: event.target.value })}
                    required
                  />
                </label>
              </div>
              <button
                className="dashboard-assessment-link"
                type="submit"
                disabled={isListingImporting}
              >
                {isListingImporting ? "Saving…" : "Save listing"}
              </button>
            </form>
          </section>
        </div>
      )}

      {isImportOpen && (
        <div
          className="developer-tools-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isImporting) {
              setIsImportOpen(false);
            }
          }}
        >
          <section
            className="developer-tools-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-users-heading"
          >
            <button
              className="developer-tools-modal-close"
              type="button"
              aria-label="Close import dialog"
              onClick={() => setIsImportOpen(false)}
              disabled={isImporting}
            >
              ×
            </button>
            <p className="dashboard-eyebrow">BULK IMPORT</p>
            <h2 id="import-users-heading">Import users</h2>
            <p>
              Choose an Excel file with <strong>name</strong>, <strong>student_id</strong>,
              and <strong>email</strong> columns. Only <strong>student_id</strong> is required.
              Imported students can register later with that ID to set their name, email,
              and password.
            </p>
            <label className="developer-tools-file-label" htmlFor="users-excel-file">
              Excel file (.xlsx)
            </label>
            <input
              ref={fileInputRef}
              id="users-excel-file"
              type="file"
              accept=".xlsx"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setError("");
              }}
            />
            {selectedFile && <p className="developer-tools-selected-file">{selectedFile.name}</p>}
            {error && <p className="developer-tools-message error" role="alert">{error}</p>}
            <div className="developer-tools-modal-actions">
              <button
                className="developer-tools-cancel-button"
                type="button"
                onClick={() => setIsImportOpen(false)}
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                className="dashboard-assessment-link"
                type="button"
                onClick={importUsers}
                disabled={isImporting}
              >
                {isImporting ? "Importing…" : "Import users"}
              </button>
            </div>
          </section>
        </div>
      )}
    </Navbar>
  );
}
