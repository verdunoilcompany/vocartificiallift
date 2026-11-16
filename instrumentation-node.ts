import { isMssqlConfigured } from "@/lib/mssql";
import { startMorningSnapshotScheduler } from "@/lib/xspoc/morning-report";

// Save the XSPOC morning report every day at 6:00 AM (server time) while the server runs.
if (isMssqlConfigured()) startMorningSnapshotScheduler();
