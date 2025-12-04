pid_file = "/tmp/vault-agent.pid"
exit_after_auth = false

vault {
  address = "http://vault:8200"
}

auto_auth {
  method "token_file" {
    config = {
      token_file_path = "/vault/config/root_token"
    }
  }

  sink "file" {
    config = {
      path = "/vault/config/agent-token"
    }
  }
}

cache {
  use_auto_auth_token = true
}

listener "tcp" {
  address = "0.0.0.0:8100"
  tls_disable = true

  proxy {
    upstream = "http://vault:8200"
  }
}
