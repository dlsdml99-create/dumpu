package io.github.dlsdml99create.dumpu;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/** 아침 알림: 정한 시간에 오늘 할 일 개수와 첫 할 일을 알려준다. 폰을 다시 켜도 이어짐. */
public class AlarmReceiver extends BroadcastReceiver {
    static final String ACTION_MORNING = "io.github.dlsdml99create.dumpu.MORNING";
    static final String ACTION_HOURLY = "io.github.dlsdml99create.dumpu.HOURLY";
    static final String ACTION_HABIT = "io.github.dlsdml99create.dumpu.HABIT";
    private static final String CH = "morning";
    private static final String CH_HOUR = "hourly";
    private static final String CH_HAB = "habit";

    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (ACTION_MORNING.equals(a)) {
            notifyToday(c);
            DumpuWidget.refreshAll(c);
        } else if (ACTION_HOURLY.equals(a)) {
            notifyHour(c);
        } else if (ACTION_HABIT.equals(a)) {
            notifyHabits(c);
        }
        // 부팅·업데이트 후, 알림을 울린 뒤 모두 다음 알림을 다시 잡는다
        schedule(c);
    }

    private static PendingIntent pi(Context c) {
        Intent i = new Intent(c, AlarmReceiver.class).setAction(ACTION_MORNING);
        return PendingIntent.getBroadcast(c, 9, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent piHour(Context c) {
        Intent i = new Intent(c, AlarmReceiver.class).setAction(ACTION_HOURLY);
        return PendingIntent.getBroadcast(c, 10, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void schedule(Context c) {
        scheduleHourly(c);
        scheduleMorning(c);
        scheduleHabit(c);
    }

    private static PendingIntent piHabit(Context c) {
        Intent i = new Intent(c, AlarmReceiver.class).setAction(ACTION_HABIT);
        return PendingIntent.getBroadcast(c, 11, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static String ymd(Calendar k) {
        return String.format(java.util.Locale.US, "%04d-%02d-%02d", k.get(Calendar.YEAR), k.get(Calendar.MONTH) + 1, k.get(Calendar.DAY_OF_MONTH));
    }

    /** 이 날 하는 습관인지: 쉬는 기간이면 아니고, 요일이 정해져 있으면 그 요일만 (월=0). */
    private static boolean habitOn(JSONObject h, Calendar day) {
        String d = ymd(day);
        JSONArray ps = h.optJSONArray("pauses");
        if (ps != null) for (int i = 0; i < ps.length(); i++) {
            JSONObject p = ps.optJSONObject(i);
            if (p != null && d.compareTo(p.optString("a")) >= 0 && d.compareTo(p.optString("b")) <= 0) return false;
        }
        JSONArray dw = h.optJSONArray("dows");
        if (dw == null || dw.length() == 0) return true;
        int mon0 = (day.get(Calendar.DAY_OF_WEEK) + 5) % 7;
        for (int i = 0; i < dw.length(); i++) if (dw.optInt(i, -1) == mon0) return true;
        return false;
    }

    private static int[] hm(String t) {
        try {
            String[] x = t.split(":");
            int hh = Integer.parseInt(x[0]), mm = Integer.parseInt(x[1]);
            if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
            return new int[]{hh, mm};
        } catch (Exception e) { return null; }
    }

    /** 습관 알림: 앞으로 가장 빠른 습관 시간 하나를 잡는다. */
    static void scheduleHabit(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        am.cancel(piHabit(c));
        JSONArray hab = Store.snapshot(c).optJSONArray("hab");
        if (hab == null || hab.length() == 0) return;
        long now = System.currentTimeMillis(), best = Long.MAX_VALUE;
        for (int i = 0; i < hab.length() && i < 50; i++) {
            JSONObject h = hab.optJSONObject(i);
            if (h == null) continue;
            int[] t = hm(h.optString("time"));
            if (t == null) continue;
            for (int off = 0; off < 8; off++) {
                Calendar k = Calendar.getInstance();
                k.add(Calendar.DAY_OF_YEAR, off);
                k.set(Calendar.HOUR_OF_DAY, t[0]); k.set(Calendar.MINUTE, t[1]); k.set(Calendar.SECOND, 0); k.set(Calendar.MILLISECOND, 0);
                if (k.getTimeInMillis() <= now + 1000 || !habitOn(h, k)) continue;
                best = Math.min(best, k.getTimeInMillis());
                break;
            }
        }
        if (best != Long.MAX_VALUE) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, best, piHabit(c));
    }

    /** 지금 시간(±15분)인 습관 중 오늘 아직 안 한 것만 알려준다. */
    private static void notifyHabits(Context c) {
        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        JSONObject s = Store.snapshot(c);
        JSONArray hab = s.optJSONArray("hab");
        if (hab == null) return;
        JSONArray today = Store.items(c, Store.today());
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CH_HAB, "습관 알림", NotificationManager.IMPORTANCE_DEFAULT));
        }
        Calendar now = Calendar.getInstance();
        int nowMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        Intent open = new Intent(c, MainActivity.class).putExtra("open", "habit")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 3, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        for (int i = 0; i < hab.length() && i < 50; i++) {
            JSONObject h = hab.optJSONObject(i);
            if (h == null) continue;
            int[] t = hm(h.optString("time"));
            if (t == null || Math.abs(t[0] * 60 + t[1] - nowMin) > 15 || !habitOn(h, now) || h.optBoolean("met")) continue;
            boolean done = false;
            String hid = "h:" + h.optString("id");
            for (int k = 0; k < today.length(); k++) {
                JSONObject o = today.optJSONObject(k);
                if (o != null && hid.equals(o.optString("id")) && o.optBoolean("done")) done = true;
            }
            if (done) continue;
            String text = h.optString("text") + " 할 시간이에요";
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH_HAB) : new Notification.Builder(c);
            b.setSmallIcon(R.drawable.ic_noti).setContentTitle("덤푸 · 습관").setContentText(text)
                    .setAutoCancel(true).setContentIntent(pi);
            nm.notify(300 + i, b.build());
        }
    }

    /** 매시간 알림: 정한 범위(hFrom~hTo) 안의 다음 정각. */
    static void scheduleHourly(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        JSONObject s = Store.snapshot(c);
        am.cancel(piHour(c));
        if (!s.optBoolean("hourly")) return;
        int from = Math.max(0, Math.min(23, s.optInt("hFrom", 9)));
        int to = Math.max(from, Math.min(23, s.optInt("hTo", 22)));
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        for (int i = 0; i < 48; i++) {
            cal.add(Calendar.HOUR_OF_DAY, 1);
            int hh = cal.get(Calendar.HOUR_OF_DAY);
            // 알림은 '지난 1시간'을 묻기 때문에 from+1 시 ~ to+1 시 정각에 울림
            if (hh >= from + 1 && hh <= to + 1) break;
        }
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), piHour(c));
    }

    static void scheduleMorning(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        JSONObject s = Store.snapshot(c);
        am.cancel(pi(c));
        if (!s.optBoolean("alarm")) return;
        int hh = 8, mm = 0;
        try {
            String[] t = s.optString("time", "08:00").split(":");
            hh = Math.max(0, Math.min(23, Integer.parseInt(t[0])));
            mm = Math.max(0, Math.min(59, Integer.parseInt(t[1])));
        } catch (Exception ignored) { }
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, hh);
        cal.set(Calendar.MINUTE, mm);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis() + 1000) cal.add(Calendar.DAY_OF_YEAR, 1);
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi(c));
    }

    private static void notifyHour(Context c) {
        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        JSONObject s = Store.snapshot(c);
        if (!s.optBoolean("hourly")) return;
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.MINUTE, -30); // 정각을 조금 넘겨 울려도 '지난 시간'을 맞게 잡도록
        int prev = cal.get(Calendar.HOUR_OF_DAY);
        // 이미 반 이상 적은 시간이면 묻지 않음
        if (Store.today().equals(s.optString("filledDay"))) {
            JSONArray f = s.optJSONArray("filled");
            if (f != null) for (int k = 0; k < f.length(); k++) if (f.optInt(k, -1) == prev) return;
        }
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CH_HOUR, "매시간 기록 알림", NotificationManager.IMPORTANCE_LOW));
        }
        Intent open = new Intent(c, MainActivity.class).putExtra("open", "daily")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 2, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String text = prev + "시~" + (prev + 1) + "시에 뭐 했어요? 눌러서 10분 칸에 적어요";
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH_HOUR) : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_noti).setContentTitle("덤푸 · 지난 1시간").setContentText(text)
                .setAutoCancel(true).setContentIntent(pi);
        nm.notify(2, b.build());
    }

    private static void notifyToday(Context c) {
        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CH, c.getString(R.string.channel_name), NotificationManager.IMPORTANCE_DEFAULT));
        }
        JSONArray a = Store.items(c, Store.today());
        int left = 0;
        String first = null;
        for (int k = 0; k < a.length(); k++) {
            JSONObject o = a.optJSONObject(k);
            if (o != null && !o.optBoolean("done")) { left++; if (first == null) first = o.optString("text"); }
        }
        String text = left == 0 ? "오늘 할 일이 없어요. 데일리에 하나 적어 볼까요?"
                : "오늘 할 일 " + left + "개: " + first + (left > 1 ? " 외 " + (left - 1) + "개" : "");
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_noti)
                .setContentTitle("덤푸")
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
                .setContentIntent(DumpuWidget.openApp(c));
        nm.notify(1, b.build());
    }
}
