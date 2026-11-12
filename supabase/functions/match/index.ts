// All gameplay goes through here. The phone only sends intentions
// (find / accept / answer); money, scoring and winners are decided in the database.
import { adminClient, corsHeaders, friendlyError, json, requireUser } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    if (!user) return json({ success: false, error: 'Please sign in again.' }, 401);

    const b = await req.json().catch(() => ({}));
    const uid = user.id;
    let rpc: { fn: string; args: Record<string, unknown> };

    switch (b.action) {
      case 'find':    rpc = { fn: 'find_match', args: { p_uid: uid } }; break;
      case 'state':   rpc = { fn: 'match_state', args: { p_uid: uid } }; break;
      case 'cancel':  rpc = { fn: 'cancel_search', args: { p_uid: uid } }; break;
      case 'respond': rpc = { fn: 'respond_match', args: { p_uid: uid, p_comp: String(b.competition_id), p_accept: b.accept === true } }; break;
      case 'answer':  rpc = { fn: 'submit_answer', args: { p_uid: uid, p_comp: String(b.competition_id), p_index: Number(b.index), p_selected: Number(b.selected) } }; break;
      case 'result':  rpc = { fn: 'match_result', args: { p_uid: uid, p_comp: String(b.competition_id) } }; break;
      default: return json({ success: false, error: 'Unknown action' }, 400);
    }

    const { data, error } = await admin.rpc(rpc.fn, rpc.args);
    if (error) return json({ success: false, error: friendlyError(error.message) });
    return json({ success: true, data });
  } catch (e) {
    console.error('match', e);
    return json({ success: false, error: 'Something went wrong. Please try again.' }, 500);
  }
});
