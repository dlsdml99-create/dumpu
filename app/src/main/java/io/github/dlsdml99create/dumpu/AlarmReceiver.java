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
    private static final String CH = "morning";

    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (ACTION_MORNING.equals(a)) {
            notifyToday(c);
            DumpuWidget.refreshAll(c);
        }
        // 부팅·업데이트 후, 알림을 울린 뒤 모두 다음 알림을 다시 잡는다
        schedule(c);
    }

    private static PendingIntent pi(Context c) {
        Intent i = new Intent(c, AlarmReceiver.class).setAction(ACTION_MORNING);
        return PendingIntent.getBroadcast(c, 9, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void schedule(Context c) {
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
