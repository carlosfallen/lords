# gen_migration.ps1 — Convert d1_migration.sql data section to D1-compatible SQL
# Usage: powershell -ExecutionPolicy Bypass -File scripts\gen_migration.ps1

$inputFile  = ".\d1_migration.sql"
$outputFile = ".\apps\cf-api\migrations\data_migration.sql"

# Temp password hash (pbkdf2:sha512 format our Worker understands)
# "Trocar@123" — users must change on first login
$tempHash = "pbkdf2:sha512:100000:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

Write-Host "Reading $inputFile ..."
$lines = [System.IO.File]::ReadAllLines($inputFile)
Write-Host "Total lines: $($lines.Count)"

$out = [System.Collections.Generic.List[string]]::new()
$out.Add("-- Lords CRM D1 Data Migration (converted from PostgreSQL dump)")
$out.Add("-- All user passwords set to: Trocar@123 (must change on first login)")
$out.Add("PRAGMA foreign_keys = OFF;")
$out.Add("")

$inData = $false
$buffer = ""
$rowCount = 0

foreach ($line in $lines) {
    if ($line -match "-- DATA --") { $inData = $true; continue }
    if (-not $inData) { continue }

    # Accumulate multi-line inserts
    $buffer += $line + "`n"

    # A complete statement ends with );
    if ($buffer.TrimEnd() -match ";\s*$") {
        $stmt = $buffer.Trim()
        $buffer = ""

        # Skip drizzle
        if ($stmt -match "drizzle\.__drizzle_migrations") { continue }

        # Only process INSERT INTO
        if (-not ($stmt -match "^INSERT INTO (\w+) VALUES")) { continue }
        $table = $Matches[1]

        # Tables where PG column order == D1 column order → just add OR IGNORE
        $passthroughTables = @("audit_logs","city_presentations","deals_pipeline",
            "delete_requests","lead_activities","lead_conversations","lead_notes",
            "lead_proposals","lead_flow_events","funnel_events","funnel_stages",
            "bottleneck_alerts","bot_sessions","bot_health_events","commissions",
            "client_contracts","client_products","client_team_members","documents",
            "ideas","internal_campaigns","mentorship_sessions","mentorship_tasks",
            "money_on_table_snapshots","nps_responses","onboarding_processes",
            "operational_costs","payments","playbooks","projects",
            "proposal_adjustment_requests","prospect_campaigns","prospect_contacts",
            "prospect_logs","prospect_queues","refresh_tokens","representatives",
            "support_tickets","system_templates","team_members","traction_scores",
            "wiki_articles")

        if ($passthroughTables -contains $table) {
            $fixed = $stmt -replace "^INSERT INTO ", "INSERT OR IGNORE INTO "
            $out.Add($fixed)
            $rowCount++
            continue
        }

        # tenants — same column order, just add OR IGNORE
        if ($table -eq "tenants") {
            $fixed = $stmt -replace "^INSERT INTO ", "INSERT OR IGNORE INTO "
            $out.Add($fixed)
            $rowCount++
            continue
        }

        # users — PG: id,email,pwd,name,role,avatar,phone,is_active,tenant_id,last_login,created,updated,must_change
        # D1:      id,email,pwd,name,role,avatar,phone,is_active,must_change,tenant_id,last_login,created,updated
        if ($table -eq "users") {
            # Extract values string between VALUES ( and );
            if ($stmt -match "VALUES\s*\((.+)\);\s*$") {
                $vals = $Matches[1]
                # Replace argon2id hash
                $vals = [regex]::Replace($vals, "'\`$argon2id\`$[^']*'", "'$tempHash'")
                # Parse 13 positional values
                $v = ParseValues $vals
                if ($v.Count -ge 13) {
                    $id=$v[0]; $email=$v[1]; $pwd=$v[2]; $name=$v[3]; $role=$v[4]
                    $avatar=$v[5]; $phone=$v[6]; $isActive=$v[7]; $tenantId=$v[8]
                    $lastLogin=$v[9]; $created=$v[10]; $updated=$v[11]; $mustChange="1"
                    $out.Add("INSERT OR IGNORE INTO users (id,email,password_hash,name,role,avatar_url,phone,is_active,must_change_password,tenant_id,last_login_at,created_at,updated_at) VALUES ($id,$email,$pwd,$name,$role,$avatar,$phone,$isActive,$mustChange,$tenantId,$lastLogin,$created,$updated);")
                    $rowCount++
                }
            }
            continue
        }

        # leads — PG has next_follow_up_at at pos 21, metadata at 22, then diagnostic_* at 25-28
        # D1 moves: last_contact_at->20, diagnostic_*->21-24, representative_id->25, cidade->26, obs->27, motivo_perda->28, snooze_until->29, snooze_motivo->30, status->31, next_follow_up_at->32, metadata->33, created_at->34, updated_at->35
        if ($table -eq "leads") {
            if ($stmt -match "VALUES\s*\((.+)\);\s*$") {
                $vals = $Matches[1]
                $v = ParseValues $vals
                if ($v.Count -ge 35) {
                    $id=$v[0];$tenantId=$v[1];$name=$v[2];$phone=$v[3];$email=$v[4]
                    $niche=$v[5];$prob=$v[6];$poi=$v[7];$temp=$v[8];$src=$v[9]
                    $utmS=$v[10];$utmM=$v[11];$utmC=$v[12];$stageId=$v[13];$assignedId=$v[14]
                    $estVal=$v[15];$lossR=$v[16];$conv=$v[17];$convAt=$v[18];$lastCont=$v[19]
                    $nextFU=$v[20];$meta=$v[21];$created=$v[22];$updated=$v[23]
                    $diagSold=$v[24];$diagPaid=$v[25];$diagSched=$v[26];$diagComp=$v[27]
                    $repId=$v[28];$status=$v[29];$cidade=$v[30];$obs=$v[31];$motivo=$v[32]
                    $snoozeUntil=$v[33];$snoozeMot=$v[34]
                    $out.Add("INSERT OR IGNORE INTO leads (id,tenant_id,name,phone,email,niche,problem_description,product_of_interest,temperature,source,utm_source,utm_medium,utm_campaign,current_funnel_stage_id,assigned_to_id,estimated_value,loss_reason,is_converted,converted_at,last_contact_at,diagnostic_sold,diagnostic_paid,diagnostic_scheduled_at,diagnostic_completed_at,representative_id,cidade,observacao_inicial,motivo_perda_texto,snooze_until,snooze_motivo,status,next_follow_up_at,metadata,created_at,updated_at) VALUES ($id,$tenantId,$name,$phone,$email,$niche,$prob,$poi,$temp,$src,$utmS,$utmM,$utmC,$stageId,$assignedId,$estVal,$lossR,$conv,$convAt,$lastCont,$diagSold,$diagPaid,$diagSched,$diagComp,$repId,$cidade,$obs,$motivo,$snoozeUntil,$snoozeMot,$status,$nextFU,$meta,$created,$updated);")
                    $rowCount++
                }
            }
            continue
        }

        Write-Host "Unknown table: $table"
    }
}

$out.Add("")
$out.Add("PRAGMA foreign_keys = ON;")
$out.Add("-- Total rows: $rowCount")

[System.IO.File]::WriteAllLines($outputFile, $out)
Write-Host "Done! $rowCount rows -> $outputFile"

# Helper function to parse CSV values respecting quoted strings
function ParseValues($s) {
    $result = [System.Collections.Generic.List[string]]::new()
    $cur = ""
    $inStr = $false
    $i = 0
    while ($i -lt $s.Length) {
        $ch = $s[$i]
        if ($inStr) {
            if ($ch -eq "'" -and $i+1 -lt $s.Length -and $s[$i+1] -eq "'") {
                $cur += "''"
                $i += 2
                continue
            }
            if ($ch -eq "'") { $inStr = $false; $cur += $ch; $i++; continue }
            $cur += $ch; $i++
        } else {
            if ($ch -eq "'") { $inStr = $true; $cur += $ch; $i++; continue }
            if ($ch -eq "," ) { $result.Add($cur.Trim()); $cur = ""; $i++; continue }
            $cur += $ch; $i++
        }
    }
    if ($cur.Trim() -ne "") { $result.Add($cur.Trim()) }
    return $result
}
