<?php
$forceReadFile = 1;
$apipath = "../../../api/";
include_once $apipath."database.php";
include $apipath."mods/builduser.php";

if (!$error) {

    // CHECK IF THE CALLER IS LOGGED AS ADMIN
    if (!$_SESSION['admin']) {
        $textstatus = "operation is not authorized";
        $error = 100;
    }
    else {
        if (!mysql_query("SELECT * FROM `".$_SESSION['prefix']."tibibi`")) {
            mysql_query('CREATE TABLE  `'.$_SESSION['prefix'].'tibibi` ('.
                            '`Tibibi_Name`             VARCHAR( 64 ) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL, '.
                            '`User_Id`                 VARCHAR( 64 ) NOT NULL, '.
                            ' CONSTRAINT `fr_Tibibi_User_Id` FOREIGN KEY (`User_Id`) REFERENCES `'.$_SESSION['prefix'].'user` '.
                            ' (`User_Id`) ON DELETE CASCADE,'.
                            ' PRIMARY KEY ( `Tibibi_Name`, `User_Id` )) ENGINE=InnoDB', $link);
        }

        if (!mysql_query("SELECT * FROM `".$_SESSION['prefix']."course`")) {
            mysql_query('CREATE TABLE  `'.$_SESSION['prefix'].'course` ('.
                            '`Course_Name`              VARCHAR( 64 ) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL, '.
                            '`User_Id`                  VARCHAR( 64 ) NOT NULL, '.
                            '`Course_Description`       TEXT NOT NULL, '.
                            ' CONSTRAINT `fr_Course_User_Id` FOREIGN KEY (`User_Id`) REFERENCES `'.$_SESSION['prefix'].'user` '.
                            ' (`User_Id`) ON DELETE CASCADE,'.
                            ' PRIMARY KEY ( `Course_Name`, `User_Id` )) ENGINE=InnoDB', $link);
        }

        if (!mysql_query("SELECT * FROM `".$_SESSION['prefix']."coursebytibibi`")) {
            mysql_query('CREATE TABLE  `'.$_SESSION['prefix'].'coursebytibibi` ('.
                            '`Course_Name`              VARCHAR( 64 ) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL, '.
                            '`Tibibi_Name`              VARCHAR( 64 ) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL, '.
                            '`User_Id`                  VARCHAR( 64 ) NOT NULL, '.
                            '`Link_Description`         TEXT NOT NULL, '.
                            ' CONSTRAINT `fr_CBT_Course_Name` FOREIGN KEY (`Course_Name`) REFERENCES `'.$_SESSION['prefix'].'course` '.
                            ' (`Course_Name`) ON UPDATE CASCADE ON DELETE CASCADE,'.
                            ' CONSTRAINT `fr_CBT_Tibibi` FOREIGN KEY (`Tibibi_Name`) REFERENCES `'.$_SESSION['prefix'].'tibibi` '.
                            ' (`Tibibi_Name`) ON UPDATE CASCADE ON DELETE CASCADE,'.
                            ' PRIMARY KEY ( `Course_Name`, `Tibibi_Name`, `User_Id` )) ENGINE=InnoDB', $link);
        }

        $status = "success";
    }
}

// PUBLISH DATA UNDER JSON FORMAT
echo '{';
echo '  "status" : "'.$status.'",';
if ($error) { echo '  "error" : '.$error.','; }
echo '  "textStatus" : "'.$textstatus.'"';
echo '}';


?>
