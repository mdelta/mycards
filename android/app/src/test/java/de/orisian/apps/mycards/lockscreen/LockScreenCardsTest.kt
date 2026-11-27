package de.orisian.apps.mycards.lockscreen

import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class LockScreenCardsTest {
    @get:Rule
    val folder = TemporaryFolder()

    private fun write(json: String): File {
        val dir = folder.newFolder("lockscreen")
        File(dir, "cards.json").writeText(json)
        File(dir, "card-0.png").writeBytes(byteArrayOf(1))
        return dir
    }

    @Test
    fun loadsCardsInOrderWithExistingImages() {
        val dir = write(
            """{"version":1,"cards":[
              {"storeName":"Shop","cardId":"1","image":"card-0.png"},
              {"storeName":"No barcode","cardId":"2"},
              {"storeName":"Missing","cardId":"3","image":"card-2.png"}]}""",
        )

        assertEquals(
            listOf(
                LockScreenCard("Shop", "1", File(dir, "card-0.png")),
                LockScreenCard("No barcode", "2", null),
                LockScreenCard("Missing", "3", null),
            ),
            LockScreenCards.load(folder.root),
        )
    }

    @Test
    fun staysInsideTheLockScreenFolder() {
        File(folder.root, "secret.png").writeBytes(byteArrayOf(1))
        write("""{"version":1,"cards":[{"storeName":"Shop","cardId":"1","image":"../secret.png"}]}""")

        assertEquals(listOf(LockScreenCard("Shop", "1", null)), LockScreenCards.load(folder.root))
    }

    @Test
    fun isEmptyWithoutOrWithBrokenFile() {
        assertEquals(emptyList<LockScreenCard>(), LockScreenCards.load(folder.root))
        write("not json")
        assertEquals(emptyList<LockScreenCard>(), LockScreenCards.load(folder.root))
    }
}
