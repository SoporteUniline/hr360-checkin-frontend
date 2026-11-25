package mx.com.adamia.app;

import android.os.Bundle;
import android.view.Window;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(0xFFFFFFFF);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
        }
        activarPasskeysEnWebView();
    }

    /**
     * (25/11/2026) Passkeys (Face ID / huella) dentro de la app: WebAuthn en la WebView como la propia app
     * (Credential Manager). Requiere WebView 128+ y androidx.webkit 1.12+; en WebViews viejas no hace nada y el
     * botón de la pantalla de inicio explica que se entre con contraseña. El dominio se asocia con
     * asset_statements (AndroidManifest) + https://adamia.com.mx/.well-known/assetlinks.json.
     */
    private void activarPasskeysEnWebView() {
        Bridge bridge = getBridge();
        WebView webView = bridge != null ? bridge.getWebView() : null;
        if (webView == null || !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_AUTHENTICATION)) {
            return;
        }
        WebSettingsCompat.setWebAuthenticationSupport(
            webView.getSettings(),
            WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_APP
        );
    }
}
