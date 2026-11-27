package de.orisian.apps.mycards;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import de.orisian.apps.mycards.lockscreen.LockScreenPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LockScreenPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
