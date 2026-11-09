package io.github.dlsdml99create.dumpu;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/** 위젯·알림이 쓰는 작은 저장소 (기기 안에만 저장). */
final class Store {
    private static final String P = "dumpu";
    private static final Object LOCK = new Object();

    private Store() { }

    private static SharedPreferences sp(Context c) {
        return c.getApplicationContext().getSharedPreferences(P, Context.MODE_PRIVATE);
    }

    static String today() { return day(0); }

    static String day(int plus) {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_YEAR, plus);
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.getTime());
    }

    static void saveSnapshot(Context c, String json) {
        synchronized (LOCK) {
            try {
                new JSONObject(json); // 올바른 형식만 저장
                sp(c).edit().putString("snap", json).apply();
            } catch (Exception ignored) { }
        }
    }

    static JSONObject snapshot(Context c) {
        synchronized (LOCK) {
            try { return new JSONObject(sp(c).getString("snap", "{}")); }
            catch (Exception e) { return new JSONObject(); }
        }
    }

    static JSONArray items(Context c, String day) {
        JSONObject days = snapshot(c).optJSONObject("days");
        JSONArray a = days == null ? null : days.optJSONArray(day);
        return a == null ? new JSONArray() : a;
    }

    /** 위젯에서 체크/해제: 위젯 표시를 바로 바꾸고, 앱이 나중에 반영할 기록을 남긴다. */
    static void toggle(Context c, String id) {
        synchronized (LOCK) {
            try {
                JSONObject snap = new JSONObject(sp(c).getString("snap", "{}"));
                JSONObject days = snap.optJSONObject("days");
                String t = today();
                JSONArray a = days == null ? null : days.optJSONArray(t);
                if (a == null) return;
                for (int i = 0; i < a.length(); i++) {
                    JSONObject o = a.getJSONObject(i);
                    if (id.equals(o.optString("id"))) {
                        boolean done = !o.optBoolean("done");
                        o.put("done", done);
                        JSONArray ops = new JSONArray(sp(c).getString("ops", "[]"));
                        ops.put(new JSONObject().put("id", id).put("done", done).put("at", t));
                        sp(c).edit().putString("snap", snap.toString()).putString("ops", ops.toString()).apply();
                        return;
                    }
                }
            } catch (Exception ignored) { }
        }
    }

    static String takeOps(Context c) {
        synchronized (LOCK) {
            String o = sp(c).getString("ops", "[]");
            sp(c).edit().remove("ops").apply();
            return o;
        }
    }
}
