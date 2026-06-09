import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // fall back to .env for anything not in .env.local
import { enqueueJob } from '../jobs/job-store';
import { runPipelineWorker } from '../jobs/run-worker';

async function main() {
  const { created, job_id } = await enqueueJob('draft_weekly_post');
  console.log(`${created ? 'enqueued' : 'reusing'} job ${job_id}`);
  for (let i = 0; i < 20; i++) {
    const s = await runPipelineWorker();
    console.log(JSON.stringify(s));
    if (s.idle || s.status === 'done' || s.status === 'failed') break;
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
