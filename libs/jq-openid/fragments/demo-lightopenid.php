<?php
require '../libs/lightopenid/openid.php';
try {
    $openid = new LightOpenID($_SERVER['HTTP_HOST']);
    if(!$openid->mode) {
        if(isset($_POST['openid_identifier'])) {
            $openid->identity = $_POST['openid_identifier'];
            # The following two lines request email, full name, and a nickname
            # from the provider. Remove them if you don't need that data.
            $openid->required = array('contact/email');
            $openid->optional = array('namePerson', 'namePerson/friendly');
            header('Location: ' . $openid->authUrl());
        }
?>
<form action="" method="post">
    OpenID: <input type="text" name="openid_identifier" /> <button>Submit</button>
</form>
<?php
    } elseif($openid->mode == 'cancel') {
        echo 'User has canceled authentication!';
    } else {
        $data = $openid->getAttributes();
        $email = $data['contact/email'];
        $first = $data['namePerson/first'];
		header('Location: '. 'http://' . $_SERVER['HTTP_HOST'] . '/pages/home.php?dashboard=DEFAULT&userid='. $email);
    }
} catch(ErrorException $e) {
    echo $e->getMessage();
}
