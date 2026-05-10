require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const dbPath = path.join(__dirname, 'data', 'db.json');

async function migrate(userId) {
    if (!userId) {
        console.error("Error: Please provide a target User UUID as an argument.");
        console.log("Usage: node migrate_data.js <USER_UUID>");
        return;
    }

    console.log(`Starting migration for user: ${userId}...`);

    if (!fs.existsSync(dbPath)) {
        console.error("Error: db.json not found in /data directory.");
        return;
    }

    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // 1. Migrate Profile
    console.log("Migrating Profile...");
    const profile = db.user;
    const { error: pError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            full_name: profile.name,
            role: profile.role,
            farm_name: profile.farmName,
            total_area: parseFloat(profile.totalArea) || 0,
            location: profile.location,
            avatar_url: profile.avatar
        });
    if (pError) console.error("Profile Migration Error:", pError);

    // 2. Migrate Plots
    console.log("Migrating Plots...");
    const plotMap = {}; // localId -> supabaseId
    for (const plot of db.plots) {
        const { data, error } = await supabase
            .from('plots')
            .insert({
                user_id: userId,
                name: plot.name,
                culture: plot.crop,
                area: plot.area,
                status: "Ativo",
                health: 0.95,
                production: plot.production || 0,
                expenses: plot.expenses || 0
            })
            .select()
            .single();
        
        if (error) {
            console.error(`Error migrating plot ${plot.name}:`, error);
        } else {
            plotMap[plot.id] = data.id;
        }
    }

    // 3. Migrate Machinery
    console.log("Migrating Machinery...");
    const machineMap = {};
    for (const machine of db.machinery) {
        const { data, error } = await supabase
            .from('machinery')
            .insert({
                user_id: userId,
                name: machine.name,
                type: machine.type,
                model: machine.model,
                year: parseInt(machine.year) || 2020,
                hours: machine.hours || 0,
                photo_url: machine.photo
            })
            .select()
            .single();
        
        if (error) {
            console.error(`Error migrating machine ${machine.name}:`, error);
        } else {
            machineMap[machine.id] = data.id;
        }
    }

    // 4. Migrate Activities
    console.log("Migrating Activities...");
    for (const act of db.activities) {
        const { error } = await supabase
            .from('activities')
            .insert({
                user_id: userId,
                plot_id: plotMap[act.plotId] || null,
                timestamp: act.timestamp,
                type: act.type,
                category: act.category,
                value: act.value || act.cost || 0,
                notes: act.description
            });
        if (error) console.error(`Error migrating activity ${act.id}:`, error);
    }

    // 5. Migrate Pests
    console.log("Migrating Pests...");
    for (const pest of db.pests) {
        const { error } = await supabase
            .from('pests')
            .insert({
                user_id: userId,
                plot_id: plotMap[pest.plotId] || null,
                question: pest.question,
                image_url: pest.image,
                report: pest.report,
                timestamp: pest.date || pest.timestamp
            });
        if (error) console.error(`Error migrating pest record ${pest.id}:`, error);
    }

    console.log("Migration finished!");
}

const targetId = process.argv[2];
migrate(targetId);
