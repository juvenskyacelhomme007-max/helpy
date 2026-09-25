package com.helpy.global;
import android.app.Activity; import android.os.Bundle; import android.webkit.WebChromeClient; import android.webkit.WebSettings; import android.webkit.WebView; import android.webkit.WebViewClient;
public class MainActivity extends Activity{
 private WebView web; private static final String HELPY_URL="https://REPLACE-WITH-YOUR-VERCEL-URL.vercel.app/";
 @Override protected void onCreate(Bundle b){super.onCreate(b);web=new WebView(this);setContentView(web);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);web.setWebViewClient(new WebViewClient());web.setWebChromeClient(new WebChromeClient());web.loadUrl(HELPY_URL);}
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}