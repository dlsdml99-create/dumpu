# 화면(자바스크립트)에서 부르는 함수 이름은 그대로 둔다
-keepclassmembers class io.github.dlsdml99create.dumpu.Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
