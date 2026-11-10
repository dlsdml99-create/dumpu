package io.github.dlsdml99create.dumpu;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/** 홈 화면 위젯: 오늘 할 일 최대 4개, 눌러서 체크. */
public class DumpuWidget extends AppWidgetProvider {
    static final String ACTION_TOGGLE = "io.github.dlsdml99create.dumpu.TOGGLE";
    private static final int[] ROWS = {R.id.w_r0, R.id.w_r1, R.id.w_r2, R.id.w_r3};
    private static final int[] HABS = {R.id.w_h0, R.id.w_h1, R.id.w_h2, R.id.w_h3};
    private static final String[] DOW = {"일", "월", "화", "수", "목", "금", "토"};

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    @Override
    public void onReceive(Context c, Intent i) {
        if (ACTION_TOGGLE.equals(i.getAction())) {
            String id = i.getStringExtra("id");
            if (id != null && id.length() < 64) {
                Store.toggle(c, id);
                refreshAll(c);
            }
            return;
        }
        super.onReceive(c, i);
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, DumpuWidget.class));
        if (ids.length == 0) return;
        RemoteViews v = build(c);
        for (int id : ids) m.updateAppWidget(id, v);
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget);
        Calendar cal = Calendar.getInstance();
        v.setTextViewText(R.id.w_title, "덤푸 · 오늘 " + (cal.get(Calendar.MONTH) + 1) + "/" + cal.get(Calendar.DAY_OF_MONTH)
                + "(" + DOW[cal.get(Calendar.DAY_OF_WEEK) - 1] + ")");

        JSONArray all = Store.items(c, Store.today());
        // 습관은 위에 ♥ 줄로 (하나씩 눌러 체크), 나머지는 체크 줄로
        JSONArray a = new JSONArray();
        JSONArray hb = new JSONArray();
        for (int k = 0; k < all.length(); k++) {
            JSONObject o = all.optJSONObject(k);
            if (o == null) continue;
            if (o.optBoolean("r")) hb.put(o); else a.put(o);
        }
        for (int k = 0; k < HABS.length; k++) {
            JSONObject o = k < hb.length() ? hb.optJSONObject(k) : null;
            if (o == null) { v.setViewVisibility(HABS[k], View.GONE); continue; }
            v.setViewVisibility(HABS[k], View.VISIBLE);
            v.setTextViewText(HABS[k], (o.optBoolean("done") ? "♥ " : "♡ ") + o.optString("text"));
            Intent t = new Intent(c, DumpuWidget.class).setAction(ACTION_TOGGLE).putExtra("id", o.optString("id"));
            v.setOnClickPendingIntent(HABS[k], PendingIntent.getBroadcast(c, 200 + k, t,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        v.setViewVisibility(R.id.w_hab, hb.length() > 0 ? View.VISIBLE : View.GONE);
        boolean rtEmpty = hb.length() == 0;
        int done = 0;
        for (int k = 0; k < a.length(); k++) if (a.optJSONObject(k) != null && a.optJSONObject(k).optBoolean("done")) done++;
        v.setTextViewText(R.id.w_count, a.length() == 0 ? "" : done + "/" + a.length());

        for (int k = 0; k < ROWS.length; k++) {
            JSONObject o = k < a.length() ? a.optJSONObject(k) : null;
            if (o == null) {
                if (k == 0 && a.length() == 0 && rtEmpty) {
                    v.setViewVisibility(ROWS[k], View.VISIBLE);
                    v.setTextViewText(ROWS[k], "오늘 할 일이 없어요");
                    v.setOnClickPendingIntent(ROWS[k], openApp(c));
                } else v.setViewVisibility(ROWS[k], View.GONE);
                continue;
            }
            boolean d = o.optBoolean("done");
            v.setViewVisibility(ROWS[k], View.VISIBLE);
            v.setTextViewText(ROWS[k], (d ? "☑  " : "☐  ") + o.optString("text"));
            Intent t = new Intent(c, DumpuWidget.class).setAction(ACTION_TOGGLE).putExtra("id", o.optString("id"));
            v.setOnClickPendingIntent(ROWS[k], PendingIntent.getBroadcast(c, 100 + k, t,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        int more = a.length() - ROWS.length;
        v.setTextViewText(R.id.w_more, more > 0 ? "+" + more + "개 더 · 앱에서 보기" : "");
        v.setViewVisibility(R.id.w_more, more > 0 ? View.VISIBLE : View.GONE);
        v.setOnClickPendingIntent(R.id.w_more, openApp(c));
        v.setOnClickPendingIntent(R.id.w_head, openApp(c));
        return v;
    }

    static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
