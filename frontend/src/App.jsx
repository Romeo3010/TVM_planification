import React, { useState, useEffect, useRef } from "react";
import logoTvm from "./TVM.jpg";
import { toPng } from "html-to-image";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarPlus,
  faArchive,
  faHome,
  faCalendarAlt,
  faArrowRight,
  faArrowLeft,
  faTimes,
  faPaperPlane,
  faPrint,
  faFolderOpen,
  faClipboardList,
  faExclamationTriangle,
  faCheckCircle,
  faImage,
  faSearch,
  faInfoCircle,
  faEdit,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

function App() {
  const [currentView, setCurrentView] = useState("menu");
  const [subView, setSubView] = useState("aucun");

  const [searchDate, setSearchDate] = useState(
    new Date().toLocaleDateString("fr-CA") 
  );
  
  // --- ÉTATS DÉDIÉS AUX ARCHIVES ---
  const [archiveMode, setArchiveMode] = useState("date"); // "date" ou "nom"
  const [archiveDate, setArchiveDate] = useState("");
  const [archiveSearchName, setArchiveSearchName] = useState(""); 

  const [programmes, setProgrammes] = useState([]);
  const [archiveProgrammes, setArchiveProgrammes] = useState([]);
  const [selectedProg, setSelectedProg] = useState(null);
  const [selectedArchiveProg, setSelectedArchiveProg] = useState(null);

  // Mode édition
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });

  // --- ÉTATS DU FORMULAIRE ---
  const [titre, setTitre] = useState("");
  const [typeProgramme, setTypeProgramme] = useState("Journal / JT");
  const [heureDebut, setHeureDebut] = useState("");
  const [dureeMinutes, setDureeMinutes] = useState("");
  const [studio, setStudio] = useState("Studio Principal");
  const [sourceVideo, setSourceVideo] = useState("Direct Live");
  const [animateur, setAnimateur] = useState("");
  const [invites, setInvites] = useState(""); 

  const diaporamaRef = useRef(null);
  const diaporamaArchiveRef = useRef(null);

  const declencherNotification = (message, type = "danger") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 8000);
  };

  // --- CHARGEMENT DU CONDUCTEUR DE PLANIFICATION ---
  const chargerProgrammes = (date) => {
    if (!date) return;
    fetch(`http://localhost:5000/api/programmes/${date}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erreur réseau");
        return res.json();
      })
      .then((data) => setProgrammes(data))
      .catch((err) => console.error(err));
  };

  // --- GESTION DES RECHERCHES D'ARCHIVES ---
  useEffect(() => {
    if (archiveMode === "date" && archiveDate) {
      fetch(`http://localhost:5000/api/programmes/${archiveDate}`)
        .then((res) => {
          if (!res.ok) throw new Error("Erreur réseau");
          return res.json();
        })
        .then((data) => setArchiveProgrammes(data))
        .catch((err) => console.error("Erreur archives par date :", err));
    }
  }, [archiveDate, archiveMode]);

  useEffect(() => {
    if (archiveMode === "nom" && archiveSearchName.trim()) {
      fetch(`http://localhost:5000/api/archives/recherche/nom?q=${encodeURIComponent(archiveSearchName)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Erreur serveur");
          return res.json();
        })
        .then((data) => setArchiveProgrammes(data))
        .catch((err) => console.error("Erreur archives par nom :", err));
    } else if (archiveMode === "nom" && !archiveSearchName.trim()) {
      setArchiveProgrammes([]);
    }
  }, [archiveSearchName, archiveMode]);

  useEffect(() => {
    if (searchDate) chargerProgrammes(searchDate);
  }, [searchDate]);

  const handleContinuerApresDate = () => {
    const aujourdHui = new Date().toLocaleDateString("fr-CA");
    if (searchDate < aujourdHui) {
      setNotification({
        show: true,
        message: "Action refusée : Impossible de planifier ou modifier la grille d'une date déjà passée.",
        type: "danger"
      });
      setTimeout(() => { setNotification({ show: false, message: "", type: "" }); }, 5000);
      return; 
    }
    setNotification({ show: false, message: "", type: "" });
    setIsEditing(false);
    reinitialiserFormulaire();
    setCurrentView("formulaire");
  };

  const reinitialiserFormulaire = () => {
    setTitre("");
    setHeureDebut("");
    setDureeMinutes("");
    setAnimateur("");
    setInvites("");
    setTypeProgramme("Journal / JT");
    setStudio("Studio Principal");
    setSourceVideo("Direct Live");
    setIsEditing(false);
    setEditingId(null);
  };

  // --- CORRECTION LOGIQUE VÉRIFICATION DE LA DATE ACCESSIBLE ---
  const estDansLeFutur = (dateDiffusion) => {
    if (!dateDiffusion) return false;
    const aujourdHui = new Date().toLocaleDateString("fr-CA");
    // Autoriser les actions si c'est aujourd'hui ou une date future
    return dateDiffusion >= aujourdHui;
  };

  // --- REQUÊTE POUR LA SUPPRESSION ---
  const handleSupprimer = (id, e) => {
    e.stopPropagation(); // Évite d'ouvrir les spécifications au clic sur la ligne
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce programme du conducteur ?")) return;

    fetch(`http://localhost:5000/api/programmes/${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur lors de la suppression.");
        return res.json();
      })
      .then(() => {
        chargerProgrammes(searchDate);
        if (selectedProg && selectedProg.id === id) setSelectedProg(null);
        declencherNotification("Le programme a été supprimé avec succès.", "success");
      })
      .catch((err) => declencherNotification(err.message, "danger"));
  };

  // --- CHARGEMENT DANS LE FORMULAIRE POUR MODIFICATION ---
  const preparerModification = (prog, e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(prog.id);
    setTitre(prog.titre);
    setTypeProgramme(prog.type_programme);
    setHeureDebut(prog.heure_debut);
    setDureeMinutes(prog.duree_minutes);
    setStudio(prog.studio);
    setSourceVideo(prog.source_video);
    setAnimateur(prog.animateur || "");
    setInvites(prog.invites || "");
    setSubView("saisie");
  };

  // --- SOUMISSION DU FORMULAIRE (AJOUT OU MODIFICATION) ---
  const handleAjouter = (e) => {
    e.preventDefault();
    setNotification({ show: false, message: "", type: "" });

    let heureDebutSec = heureDebut;
    if (heureDebutSec && heureDebutSec.split(":").length === 2) heureDebutSec += ":00";
    let dureeSec = dureeMinutes;
    if (dureeSec && dureeSec.split(":").length === 2) dureeSec += ":00";

    const donneesProgramme = {
      titre: titre.trim(),
      type_programme: typeProgramme,
      date_diffusion: searchDate,
      heure_debut: heureDebutSec,
      duree_minutes: dureeSec,
      studio,
      source_video: sourceVideo,
      animateur: animateur.trim(),
      invites: invites.trim(), 
    };

    const url = isEditing 
      ? `http://localhost:5000/api/programmes/${editingId}` 
      : "http://localhost:5000/api/programmes";
      
    const methode = isEditing ? "PUT" : "POST";

    fetch(url, {
      method: methode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donneesProgramme),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.error || "Erreur") });
        return res.json();
      })
      .then(() => {
        reinitialiserFormulaire();
        chargerProgrammes(searchDate);
        declencherNotification(
          isEditing ? "Le programme a été mis à jour avec succès !" : "Le programme a été enregistré et publié avec succès !", 
          "success"
        );
        setSubView("apercu");
      })
      .catch((err) => declencherNotification(err.message, "danger"));
  };

  const telechargerDiaporamaImage = (referenceCible, dateFichier) => {
    if (referenceCible.current === null) return;
    toPng(referenceCible.current, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `diaporama_TVM_${dateFichier}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error(err));
  };

  const formaterDateLettres = (dateString) => {
    if (!dateString) return "";
    const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    return new Date(dateString).toLocaleDateString("fr-FR", options).toUpperCase();
  };

  const formaterDateCourte = (dateString) => {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return dateString; 
    return dateObj.toLocaleDateString("fr-FR");
  };

  return (
    <div style={{ fontFamily: "Segoe UI, sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      {/* HEADER GLOBAL */}
      <header className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm sticky-top p-3" style={{ borderBottom: "4px solid #e74c3c" }}>
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3" style={{ cursor: "pointer" }} onClick={() => { setCurrentView("menu"); setSubView("aucun"); setNotification({ show: false, message: "", type: "" }); }}>
            <img src={logoTvm} alt="Logo TVM" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "4px" }} />
            <span className="text-white fw-bold h4 m-0">TVM-planification</span>
          </div>
          {currentView !== "menu" && (
            <button className="btn btn-sm btn-outline-light fw-bold" onClick={() => { setCurrentView("menu"); setSubView("aucun"); setNotification({ show: false, message: "", type: "" }); }}>
              <FontAwesomeIcon icon={faHome} /> Menu Principal
            </button>
          )}
        </div>
      </header>

      {/* ZONE PRINCIPALE */}
      <main className="container py-5">
        {notification.show && currentView !== "choix-date" && (
          <div className={`alert alert-${notification.type} fw-bold mb-4 shadow-sm mx-auto`} style={{ maxWidth: "750px" }}>
            <FontAwesomeIcon icon={notification.type === "success" ? faCheckCircle : faExclamationTriangle} className="me-2" />
            {notification.message}
          </div>
        )}

        {/* VUE 1 : ACCUEIL PRINCIPAL */}
        {currentView === "menu" && (
          <div className="text-center py-4">
            <div className="card shadow border-0 p-5 mx-auto bg-white rounded-3" style={{ maxWidth: "750px" }}>
              <h2 className="fw-bold text-dark mb-3">Bonjour cher utilisateur,</h2>
              <p className="text-secondary fs-5 mb-5">Bienvenue sur la plateforme de planification de la TVM. Que voulez-vous faire aujourd'hui ?</p>
              <div className="row g-4 justify-content-center">
                <div className="col-sm-6">
                  <button onClick={() => { setNotification({ show: false, message: "", type: "" }); setCurrentView("choix-date"); }} className="btn btn-lg btn-danger w-100 py-3 fw-bold shadow-sm d-flex flex-column align-items-center justify-content-center gap-3">
                    <FontAwesomeIcon icon={faCalendarPlus} className="fs-2" /> Créer un planning
                  </button>
                </div>
                <div className="col-sm-6">
                  <button onClick={() => { setNotification({ show: false, message: "", type: "" }); setArchiveProgrammes([]); setSelectedArchiveProg(null); setCurrentView("archives"); }} className="btn btn-lg btn-success w-100 py-3 fw-bold shadow-sm d-flex flex-column align-items-center justify-content-center gap-3">
                    <FontAwesomeIcon icon={faArchive} className="fs-2" /> Voir les archives
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VUE 2 : SÉLECTION DE LA DATE */}
        {currentView === "choix-date" && (
          <div className="text-center py-4">
            <div className="card shadow-sm border-0 p-5 mx-auto bg-white rounded-3" style={{ maxWidth: "500px" }}>
              <h3 className="fw-bold text-dark mb-4"><FontAwesomeIcon icon={faCalendarAlt} className="text-danger me-2" /> Sélectionner la date</h3>
              <div className="mb-4">
                <input type="date" className="form-control form-control-lg border-2 fw-bold text-primary text-center" value={searchDate} onChange={(e) => { setNotification({ show: false, message: "", type: "" }); setSearchDate(e.target.value); }} required />
              </div>
              {notification.show && <div className={`alert alert-${notification.type} small fw-bold mb-4 text-start`}><FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />{notification.message}</div>}
              <div className="d-flex gap-3">
                <button onClick={() => setCurrentView("menu")} className="btn btn-outline-secondary w-100 fw-bold"><FontAwesomeIcon icon={faTimes} /> Annuler</button>
                <button onClick={handleContinuerApresDate} className="btn btn-danger w-100 fw-bold shadow-sm" disabled={!searchDate}>Suivant <FontAwesomeIcon icon={faArrowRight} /></button>
              </div>
            </div>
          </div>
        )}

        {/* VUE 3 : FORMULAIRE ET GRILLE DU JOUR */}
        {currentView === "formulaire" && (
          <div>
            <div className="mx-auto mb-4" style={{ maxWidth: "750px" }}>
              <button onClick={() => setCurrentView("choix-date")} className="btn btn-sm btn-secondary fw-bold shadow-sm"><FontAwesomeIcon icon={faArrowLeft} /> Retour</button>
            </div>
            <div className="card shadow-sm border-0 p-4 mb-4 bg-white text-center mx-auto" style={{ maxWidth: "750px" }}>
              <h4 className="fw-bold">Planning du : <span className="text-danger">{formaterDateCourte(searchDate)}</span></h4>
              <div className="d-flex justify-content-center gap-3 mt-3">
                <button onClick={() => { reinitialiserFormulaire(); setSubView("saisie"); }} className="btn btn-danger px-4 py-2 fw-bold shadow-sm"><FontAwesomeIcon icon={faCalendarPlus} /> Ajouter un programme</button>
                <button onClick={() => setSubView("apercu")} className="btn px-4 py-2 fw-bold text-white shadow-sm" style={{ backgroundColor: "#6f42c1" }}><FontAwesomeIcon icon={faClipboardList} /> Voir le Conducteur</button>
              </div>
            </div>

            {subView === "saisie" && (
              <div className="card shadow-sm border-0 rounded-3 mx-auto bg-white p-4" style={{ maxWidth: "750px" }}>
                <h5 className="fw-bold text-dark border-bottom pb-2 mb-4">
                  {isEditing ? "Modification de l'émission" : "Ajout d'émission"}
                </h5>
                <form onSubmit={handleAjouter}>
                  <div className="mb-3"><label className="form-label small">Intitulé du programme :</label><input type="text" className="form-control" value={titre} onChange={(e) => setTitre(e.target.value)} required /></div>
                  <div className="mb-3">
                    <label className="form-label small">Catégorie :</label>
                    <select className="form-select" value={typeProgramme} onChange={(e) => setTypeProgramme(e.target.value)}>
                      <option value="Sport">Sport</option><option value="Divertissement">Divertissement</option><option value="Journal / JT">Journal / JT</option><option value="Film / Série">Film / Série</option><option value="Documentaire">Documentaire</option><option value="Culturel">Culturel</option><option value="Variété">Variété</option><option value="Publicité / Intermède">Publicité / Intermède</option><option value="Appel Téléphonique Régional">Appel Téléphonique Régional</option><option value="Duplex Extérieur">Duplex Extérieur</option>
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6"><label className="form-label small">Heure Début :</label><input type="time" step="1" className="form-control" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} required /></div>
                    <div className="col-6"><label className="form-label small">Durée :</label><input type="time" step="1" className="form-control" value={dureeMinutes} onChange={(e) => setDureeMinutes(e.target.value)} required /></div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small">Studio technique :</label>
                    <select className="form-select" value={studio} onChange={(e) => setStudio(e.target.value)}><option value="Studio Principal">Studio Principal</option><option value="Studio Annexe">Studio Annexe</option><option value="Automatique">Automatique</option></select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small">Source Video :</label>
                    <select className="form-select" value={sourceVideo} onChange={(e) => setSourceVideo(e.target.value)}><option value="Direct Live">Direct Live</option><option value="Serveur NAS / Fichier">Serveur NAS / Fichier</option></select>
                  </div>
                  <div className="mb-3"><label className="form-label small">Animateur :</label><input type="text" className="form-control" value={animateur} onChange={(e) => setAnimateur(e.target.value)} /></div>
                  <div className="mb-4"><label className="form-label small">Invité(s) :</label><input type="text" className="form-control" value={invites} onChange={(e) => setInvites(e.target.value)} /></div>
                  <div className="d-flex gap-2">
                    <button type="button" onClick={() => { reinitialiserFormulaire(); setSubView("aucun"); }} className="btn btn-secondary w-50">Fermer</button>
                    <button type="submit" className="btn btn-danger w-50 fw-bold">{isEditing ? "Enregistrer les modifications" : "Publier"}</button>
                  </div>
                </form>
              </div>
            )}

            {subView === "apercu" && (
              <div className="row">
                <div className="col-12 mb-4 d-flex flex-column align-items-end gap-2">
                  <button onClick={() => telechargerDiaporamaImage(diaporamaRef, searchDate)} className="btn btn-primary fw-bold shadow-sm"><FontAwesomeIcon icon={faImage} /> Télécharger Image Diaporama (.png)</button>
                  <a href={`http://localhost:5000/api/programmes/conducteur/${searchDate}`} className="btn btn-success fw-bold shadow-sm"><FontAwesomeIcon icon={faPrint} /> Télécharger le conducteur PDF</a>
                </div>
                <div className="col-xl-7 col-lg-6 mb-4">
                  <table className="table table-hover bg-white rounded shadow-sm align-middle">
                    <thead className="table-dark"><tr><th>Horaires</th><th>Émission</th><th>Catégorie</th><th className="text-center" style={{ width: "180px" }}>Actions</th></tr></thead>
                    <tbody>
                      {programmes.map((p) => {
                        const accessible = estDansLeFutur(p.date_diffusion);
                        return (
                          <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setSelectedProg(p)}>
                            <td className="fw-bold text-primary">{p.heure_debut ? p.heure_debut.substring(0, 5) : "00:00"} - {p.heure_fin ? p.heure_fin.substring(0, 5) : "00:00"}</td>
                            <td>{p.titre}</td>
                            <td>{p.type_programme}</td>
                            {/* CORRECTION DU BOUTON ET DES ALIGNEMENTS AVEC FLEXBOX */}
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center", whiteSpace: "nowrap" }}>
                                <button className="btn btn-xs btn-outline-primary px-2 py-1" title="Ouvrir les détails" onClick={() => setSelectedProg(p)}>Ouvrir</button>
                                
                                {accessible && (
                                  <>
                                    <button className="btn btn-xs btn-warning text-dark px-2 py-1" title="Modifier l'émission" onClick={(e) => preparerModification(p, e)}>
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button className="btn btn-xs btn-danger px-2 py-1" title="Supprimer l'émission" onClick={(e) => handleSupprimer(p.id, e)}>
                                      <FontAwesomeIcon icon={faTrashAlt} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="col-xl-5 col-lg-6 mb-4">
                  <div className="card shadow-sm p-4 bg-white h-100">
                    <h5 className="fw-bold border-bottom pb-2 text-primary">Spécifications</h5>
                    {selectedProg ? (
                      <div className="mt-3">
                        <p><strong>Titre :</strong> {selectedProg.titre}</p><p><strong>Catégorie :</strong> {selectedProg.type_programme}</p><p><strong>Horaires :</strong> {selectedProg.heure_debut} à {selectedProg.heure_fin}</p><p><strong>Durée :</strong> {selectedProg.duree_minutes}</p><p><strong>Studio :</strong> {selectedProg.studio}</p><p><strong>Source :</strong> {selectedProg.source_video}</p><p><strong>Animateur :</strong> {selectedProg.animateur || "Aucun"}</p><p><strong>Invités :</strong> {selectedProg.invites || "Aucun"}</p>
                      </div>
                    ) : <p className="text-muted small">Sélectionnez une émission.</p>}
                  </div>
                </div>

                {/* HIDDEN DIAPORAMA */}
                <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
                  <div ref={diaporamaRef} style={{ width: "1080px", backgroundColor: "#080f18", color: "#fff", padding: "50px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid #e74c3c", paddingBottom: "20px", marginBottom: "35px" }}>
                      <div><h1>Fandaharantsika Anio</h1><h4>{formaterDateLettres(searchDate)}</h4></div>
                      <img src={logoTvm} alt="logo" style={{ height: "60px", width: "60px", borderRadius: "6px" }} />
                    </div>
                    {programmes.map((p, idx) => (
                      <div key={p.id} style={{ display: "flex", padding: "20px", backgroundColor: idx % 2 === 0 ? "rgba(255,255,255,0.04)" : "transparent" }}>
                        <div style={{ width: "220px", fontSize: "2rem", color: "#f39c12", fontFamily: "monospace" }}>{p.heure_debut ? p.heure_debut.substring(0,5) : "00:00"}</div>
                        <div style={{ fontSize: "1.9rem", textTransform: "uppercase" }}>{p.titre}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VUE 4 : ARCHIVES - DOUBLE RECHERCHE */}
        {currentView === "archives" && (
          <div className="card p-4 shadow-sm border-0 rounded-3 bg-white">
            <h3 className="fw-bold text-dark mb-4">
              <FontAwesomeIcon icon={faArchive} className="text-success me-2" /> 
              Consultation des Archives Historiques
            </h3>
            
            {/* SÉLECTEUR DE MODE DE RECHERCHE */}
            <div className="card p-3 bg-light border-0 mb-4 rounded-3">
              <label className="form-label fw-bold text-secondary mb-2">
                <FontAwesomeIcon icon={faInfoCircle} className="me-1" /> sélectionner un méthode de recherche :
              </label>
              <div className="d-flex gap-4">
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    name="archiveMode" 
                    id="modeDate" 
                    value="date" 
                    checked={archiveMode === "date"} 
                    onChange={() => {
                      setArchiveMode("date");
                      setArchiveSearchName("");
                      setArchiveProgrammes([]);
                      setSelectedArchiveProg(null);
                    }} 
                  />
                  <label className="form-check-label fw-bold text-dark" htmlFor="modeDate" style={{ cursor: "pointer" }}>
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-1 text-muted" /> Par Date précise
                  </label>
                </div>
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    name="archiveMode" 
                    id="modeNom" 
                    value="nom" 
                    checked={archiveMode === "nom"} 
                    onChange={() => {
                      setArchiveMode("nom");
                      setArchiveDate("");
                      setArchiveProgrammes([]);
                      setSelectedArchiveProg(null);
                    }} 
                  />
                  <label className="form-check-label fw-bold text-dark" htmlFor="modeNom" style={{ cursor: "pointer" }}>
                    <FontAwesomeIcon icon={faSearch} className="me-1 text-muted" /> Par Nom de Programme
                  </label>
                </div>
              </div>
            </div>

            {/* ELEMENTS DE CONFIGURATION SELON LE MODE */}
            <div className="row mb-4 align-items-end">
              {archiveMode === "date" && (
                <div className="col-md-5">
                  <label className="form-label fw-bold text-secondary">Choisir une date historique :</label>
                  <input 
                    type="date" 
                    className="form-control form-control-lg border-2 fw-bold text-success text-center" 
                    value={archiveDate} 
                    onChange={(e) => { setArchiveDate(e.target.value); setSelectedArchiveProg(null); }} 
                  />
                </div>
              )}

              {archiveMode === "nom" && (
                <div className="col-md-6">
                  <label className="form-label fw-bold text-secondary">Saisir le Nom du programme recherché :</label>
                  <div className="input-group">
                    <span className="input-group-text bg-dark text-white"><FontAwesomeIcon icon={faSearch} /></span>
                    <input 
                      type="text" 
                      className="form-control form-control-lg border-2" 
                      placeholder="Exemple : Journal, Sport..." 
                      value={archiveSearchName} 
                      onChange={(e) => { setArchiveSearchName(e.target.value); setSelectedArchiveProg(null); }} 
                    />
                  </div>
                </div>
              )}

              {archiveMode === "date" && archiveDate && archiveProgrammes.length > 0 && (
                <div className="col-md-7 d-flex flex-column align-items-end gap-2 mt-3 mt-md-0">
                  <a href={`http://localhost:5000/api/programmes/conducteur/${archiveDate}`} className="btn btn-success btn-sm fw-bold shadow-sm" style={{ minWidth: "280px" }}><FontAwesomeIcon icon={faPrint} /> Télécharger le PDF d'Archive</a>
                </div>
              )}
            </div>

            {/* SECTION RÉSULTATS ARCHIVES */}
            <div className="row">
              <div className={selectedArchiveProg ? "col-xl-7 col-lg-6 mb-4" : "col-12 mb-4"}>
                <div className="table-responsive border rounded shadow-sm bg-white">
                  <table className="table table-striped table-hover align-middle mb-0">
                    <thead className="table-dark">
                      {archiveMode === "nom" ? (
                        <tr>
                          <th>Nom du programme</th>
                          <th>Date de diffusion</th>
                          <th>Heure de début</th>
                          <th>Heure de fin</th>
                          <th>Durée exacte</th>
                        </tr>
                      ) : (
                        <tr>
                          <th>Horaires</th>
                          <th>Émission / Programme</th>
                          <th>Catégorie</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {((archiveMode === "date" && !archiveDate) || (archiveMode === "nom" && !archiveSearchName.trim())) && (
                        <tr>
                          <td colSpan={archiveMode === "nom" ? "5" : "3"} className="text-center py-4 text-muted font-italic">
                            <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                            {archiveMode === "date" ? "Veuillez choisir une date." : "Saisissez un nom d'émission."}
                          </td>
                        </tr>
                      )}

                      {((archiveMode === "date" && archiveDate) || (archiveMode === "nom" && archiveSearchName.trim())) && archiveProgrammes.length === 0 && (
                        <tr>
                          <td colSpan={archiveMode === "nom" ? "5" : "3"} className="text-center py-4 text-danger fw-bold">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                            Aucun enregistrement trouvé.
                          </td>
                        </tr>
                      )}

                      {archiveProgrammes.length > 0 && archiveProgrammes.map((ap) => (
                        <tr key={ap.id} style={{ cursor: "pointer" }} onClick={() => setSelectedArchiveProg(ap)}>
                          {archiveMode === "nom" ? (
                            <>
                              <td className="fw-bold text-dark">{ap.titre}</td>
                              <td className="fw-bold text-success">{formaterDateCourte(ap.date_diffusion)}</td>
                              <td className="fw-bold text-primary">{ap.heure_debut ? ap.heure_debut.substring(0, 5) : "00:00"}</td>
                              <td className="fw-bold text-danger">{ap.heure_fin ? ap.heure_fin.substring(0, 5) : "00:00"}</td>
                              <td className="fw-bold text-secondary">{ap.duree_minutes}</td>
                            </>
                          ) : (
                            <>
                              <td className="fw-bold text-primary">{ap.heure_debut ? ap.heure_debut.substring(0, 5) : "00:00"} - {ap.heure_fin ? ap.heure_fin.substring(0, 5) : "00:00"}</td>
                              <td>{ap.titre}</td>
                              <td>{ap.type_programme}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {selectedArchiveProg && (
                <div className="col-xl-5 col-lg-6 mb-4">
                  <div className="card shadow-sm p-4 bg-white h-100">
                    <h5 className="fw-bold border-bottom pb-2 text-success">Fiche d'Archive</h5>
                    <div className="mt-3">
                      <p><strong>Titre :</strong> {selectedArchiveProg.titre}</p>
                      <p><strong>Date :</strong> {formaterDateCourte(selectedArchiveProg.date_diffusion)}</p>
                      <p><strong>Catégorie :</strong> {selectedArchiveProg.type_programme}</p>
                      <p><strong>Horaires :</strong> {selectedArchiveProg.heure_debut} à {selectedArchiveProg.heure_fin}</p>
                      <p><strong>Durée :</strong> {selectedArchiveProg.duree_minutes}</p>
                      <p><strong>Studio :</strong> {selectedArchiveProg.studio}</p>
                      <p><strong>Source :</strong> {selectedArchiveProg.source_video}</p>
                      <p><strong>Animateur :</strong> {selectedArchiveProg.animateur || "Aucun"}</p>
                      <p><strong>Invités :</strong> {selectedArchiveProg.invites || "Aucun"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;