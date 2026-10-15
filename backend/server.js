const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const PDFDocument = require('pdfkit'); 
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Connexion à la base de données MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tvm_db' 
});

db.connect((err) => {
    if (err) {
        console.error('❌ Erreur de connexion MySQL :', err.message);
        return;
    }
    console.log('✅ Connecté avec succès à la base de données MySQL (tvm_db)');
});

// --- ROUTE D'AJOUT D'UN PROGRAMME ---
app.post('/api/programmes', (req, res) => {
    const { titre, type_programme, date_diffusion, heure_debut, duree_minutes, studio, source_video, animateur, invites } = req.body;

    if (!titre || !date_diffusion || !heure_debut || !duree_minutes) {
        return res.status(400).json({ error: "Champs obligatoires manquants (titre, date, heure début ou durée)." });
    }

    const [hDebut, mDebut, sDebut] = heure_debut.split(':').map(Number);
    const [hDuree, mDuree, sDuree] = duree_minutes.split(':').map(Number);

    let totalSecondesFin = (hDebut * 3600 + mDebut * 60 + (sDebut || 0)) + (hDuree * 3600 + mDuree * 60 + (sDuree || 0));

    const heuresFin = Math.floor(totalSecondesFin / 3600) % 24;
    totalSecondesFin %= 3600;
    const minutesFin = Math.floor(totalSecondesFin / 60);
    const secondesFin = totalSecondesFin % 60;

    const heure_fin = [
        String(heuresFin).padStart(2, '0'),
        String(minutesFin).padStart(2, '0'),
        String(secondesFin).padStart(2, '0')
    ].join(':');

    const sqlQuery = "INSERT INTO programmes (titre, type_programme, date_diffusion, heure_debut, duree_minutes, heure_fin, studio, source_video, animateur, invites) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    db.query(sqlQuery, [titre, type_programme, date_diffusion, heure_debut, duree_minutes, heure_fin, studio, source_video, animateur, invites], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Erreur lors de l'insertion dans la base de données." });
        }
        res.status(201).json({ message: "Programme ajouté avec succès !", id: result.insertId });
    });
});

// --- ROUTE DE RÉCUPÉRATION DES PROGRAMMES (PAR DATE) ---
app.get('/api/programmes/:date', (req, res) => {
    const { date } = req.params; 
    const sqlQuery = "SELECT * FROM programmes WHERE date_diffusion = ? ORDER BY heure_debut ASC";

    db.query(sqlQuery, [date], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Erreur lors de l'extraction des données." });
        }
        res.json(results);
    });
});

// 🔍 --- RECHERCHE HISTORIQUE STRICTEMENT PAR NOM DE PROGRAMME (TITRE) ---
app.get('/api/archives/recherche/nom', (req, res) => {
    const { q } = req.query; 
    if (!q) {
        return res.json([]);
    }
    
    // Recherche filtrée uniquement sur la colonne `titre` (Ex: Torak'hehy)
    const sqlQuery = "SELECT * FROM programmes WHERE titre LIKE ? ORDER BY date_diffusion DESC, heure_debut ASC";
    
    db.query(sqlQuery, [`%${q}%`], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Erreur lors de la recherche par nom." });
        }
        res.json(results);
    });
});

// --- ROUTE POUR GÉNÉRER, INJECTER LE LOGO ET TÉLÉCHARGER LE PDF ---
app.get('/api/programmes/conducteur/:date', (req, res) => {
    const { date } = req.params;
    const sqlQuery = "SELECT * FROM programmes WHERE date_diffusion = ? ORDER BY heure_debut ASC";
    
    db.query(sqlQuery, [date], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erreur serveur lors de la génération du PDF.");
        }

        const doc = new PDFDocument({ size: 'A4', margin: 40 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=conducteur_tvm_${date}.pdf`);

        doc.pipe(res);
        
        const logoPath = path.join(__dirname, '..', 'frontend', 'src', 'TVM.jpg');
        if (fs.existsSync(logoPath)) {
            try { doc.image(logoPath, 40, 30, { width: 55 }); } catch (e) {}
        }

        doc.fillColor('#2c3e50').font('Helvetica-Bold').fontSize(18).text("TELEVISION MALAGASY (TVM)", 110, 35);
        doc.fillColor('#e74c3c').font('Helvetica-Bold').fontSize(11).text(`CONDUCTEUR D'ANTENNE DU : ${date}`, 110, 58);
        doc.fillColor('#7f8c8d').font('Helvetica-Oblique').fontSize(9).text("Grille officielle des programmes de diffusion", 110, 73);

        doc.strokeColor('#e74c3c').lineWidth(2.5).moveTo(40, 95).lineTo(555, 95).stroke();

        let yPos = 115; 

        doc.rect(40, yPos, 515, 24).fill('#2c3e50'); 
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5);
        doc.text("HORAIRES", 50, yPos + 7);
        doc.text("TITRE DE L'EMISSION / PROGRAMME", 150, yPos + 7);
        doc.text("CATEGORIE", 360, yPos + 7);
        doc.text("DUREE", 470, yPos + 7);

        yPos += 24; 

        if (results.length === 0) {
            doc.fillColor('#7f8c8d').font('Helvetica-Oblique').fontSize(11);
            doc.text("Aucun programme planifié pour cette journée.", 40, yPos + 30, { align: 'center' });
            yPos += 60;
        } else {
            results.forEach((prog, index) => {
                if (yPos > 700) { doc.addPage(); yPos = 50; }
                if (index % 2 === 0) { doc.rect(40, yPos, 515, 32).fill('#f8f9fa'); }

                doc.strokeColor('#eaeded').lineWidth(0.5).moveTo(40, yPos + 32).lineTo(555, yPos + 32).stroke();

                doc.fillColor('#e74c3c').font('Helvetica-Bold').fontSize(10);
                const hDebFormate = prog.heure_debut ? prog.heure_debut.substring(0, 5) : '00:00';
                const hFinFormate = prog.heure_fin ? prog.heure_fin.substring(0, 5) : '00:00';
                doc.text(`${hDebFormate} - ${hFinFormate}`, 50, yPos + 11);

                doc.fillColor('#2c3e50').font('Helvetica-Bold').fontSize(10);
                doc.text(prog.titre || 'Sans titre', 150, yPos + 11, { width: 190, ellipsis: true });

                doc.fillColor('#7f8c8d').font('Helvetica').fontSize(9);
                doc.text(prog.type_programme || 'Général', 360, yPos + 11);

                doc.fillColor('#555555').font('Helvetica-Bold').fontSize(10);
                doc.text(prog.duree_minutes || '00:00:00', 470, yPos + 11);

                yPos += 32;
            });
        }

        if (yPos > 650) { doc.addPage(); yPos = 50; }
        yPos += 40; 
        doc.strokeColor('#bdc3c7').lineWidth(0.5).dash(4, { space: 2 }).moveTo(40, yPos).lineTo(555, yPos).stroke();
        doc.undash(); 

        yPos += 20;
        doc.fillColor('#2c3e50').fontSize(10).font('Helvetica-Bold');
        doc.text("Le Responsable de la Régie", 40, yPos, { width: 240, align: 'center' });
        doc.text("La Direction Générale TVM", 315, yPos, { width: 240, align: 'center' });

        doc.end();
    });
});

// 🗑️ --- ROUTE DE SUPPRESSION D'UN PROGRAMME (AJOUTÉE) ---
app.delete('/api/programmes/:id', (req, res) => {
    const { id } = req.params;
    const sqlQuery = "DELETE FROM programmes WHERE id = ?";

    db.query(sqlQuery, [id], (err, result) => {
        if (err) {
            console.error("❌ Erreur SQL lors de la suppression :", err);
            return res.status(500).json({ error: "Erreur lors de la suppression du programme dans la base de données." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Programme introuvable." });
        }

        // Renvoie un vrai JSON pour satisfaire le client React
        return res.json({ success: true, message: "Programme supprimé avec succès !" });
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré avec succès sur le port ${PORT}`);
});